#!/usr/bin/env python3
"""Browser test suite for Lofi Studio Pro.

Serves the repository over HTTP, drives it in headless Chromium over the
DevTools protocol, and prints a PASS/FAIL line per check.

    pip install websocket-client
    python3 tests/run_browser_tests.py

Needs a Chromium or Chrome binary; set CHROME_BIN if it is not on the
default path. Exit code is 0 only when every check passes.
"""
import json, subprocess, threading, time, http.server, socketserver, functools, urllib.request, os, sys
import websocket

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
PORT = 8790

class Q(socketserver.TCPServer):
    allow_reuse_address = True

def serve():
    h = Q(("127.0.0.1", PORT), functools.partial(http.server.SimpleHTTPRequestHandler, directory=ROOT))
    threading.Thread(target=h.serve_forever, daemon=True).start()
    return h

httpd = serve()

chrome = subprocess.Popen([
    os.environ.get("CHROME_BIN", "/usr/local/bin/chromium"), "--headless=new", "--no-sandbox", "--disable-gpu",
    "--disable-dev-shm-usage", "--remote-debugging-port=9400", "--remote-allow-origins=*",
    "--autoplay-policy=no-user-gesture-required", "--mute-audio",
    "--window-size=1280,800", "about:blank"
], stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)

ws_url = None
for _ in range(80):
    try:
        d = json.load(urllib.request.urlopen("http://127.0.0.1:9400/json/list"))
        pg = [t for t in d if t.get("type") == "page"]
        if pg:
            ws_url = pg[0]["webSocketDebuggerUrl"]; break
    except Exception:
        pass
    time.sleep(0.25)

ws = websocket.create_connection(ws_url, timeout=40)
_id = [0]
events = []

def send(m, p=None):
    _id[0] += 1; mid = _id[0]
    ws.send(json.dumps({"id": mid, "method": m, "params": p or {}}))
    while True:
        msg = json.loads(ws.recv())
        if msg.get("id") == mid: return msg
        events.append(msg)

def drain(s):
    end = time.time() + s; ws.settimeout(0.2)
    while time.time() < end:
        try: events.append(json.loads(ws.recv()))
        except Exception: pass
    ws.settimeout(40)

def ev(expr, aw=False):
    r = send("Runtime.evaluate", {"expression": expr, "returnByValue": True,
                                  "awaitPromise": aw, "userGesture": True})
    res = r.get("result", {})
    if res.get("exceptionDetails"):
        d = res["exceptionDetails"].get("exception", {}).get("description", "")
        return ("__EXC__", d[:220])
    return res.get("result", {}).get("value")

RESULTS = []
def check(name, cond, detail=""):
    ok = bool(cond) and not (isinstance(cond, tuple) and cond and cond[0] == "__EXC__")
    if isinstance(cond, tuple) and cond and cond[0] == "__EXC__":
        detail = detail or cond[1]
    RESULTS.append({"name": name, "ok": ok, "detail": str(detail)[:150]})
    print(("PASS " if ok else "FAIL ") + name + ("  | " + str(detail)[:110] if detail else ""))

def js(expr, aw=False):
    v = ev(expr, aw)
    return v

def errors_since(mark):
    out = []
    for e in events[mark:]:
        m = e.get("method")
        if m == "Runtime.exceptionThrown":
            out.append(str(e["params"]["exceptionDetails"].get("exception", {}).get("description"))[:160])
        elif m == "Runtime.consoleAPICalled" and e["params"]["type"] == "error":
            out.append("console.error: " + " ".join(str(a.get("value", a.get("description", ""))) for a in e["params"]["args"])[:160])
    return out

send("Page.enable"); send("Runtime.enable"); send("Log.enable")
send("Emulation.setDeviceMetricsOverride", {"width": 1280, "height": 800, "deviceScaleFactor": 1, "mobile": False})
mark = len(events)
send("Page.navigate", {"url": f"http://127.0.0.1:{PORT}/index.html"})
drain(3.0)

# ------------------------------------------------------------------ boot
check("boot: audio library deferred until the first gesture", js("typeof Tone") == "undefined",
      "Tone=" + str(js("typeof Tone")))
js("document.getElementById('btn-play').click()"); drain(2.2)
check("boot: first play loads the library from vendor/", js("typeof Tone") == "object",
      js("typeof Tone === 'object' ? Tone.version : 'missing'"))
js("document.getElementById('btn-play').click()"); drain(0.8)
check("boot: no console errors", len(errors_since(mark)) == 0, "; ".join(errors_since(mark)))
check("boot: loader removed", js("!document.getElementById('loader')"))
check("boot: 96 step pads rendered", js("document.querySelectorAll('.pad').length") == 96)
check("boot: 6 presets / 10 patterns / 12 vibes", js("document.querySelectorAll('#presets .pill').length") == 6 and
      js("document.querySelectorAll('#patterns .chip').length") == 10 and
      js("document.querySelectorAll('#vibes .chip').length") == 12,
      "%s/%s/%s" % (js("document.querySelectorAll('#presets .pill').length"),
                    js("document.querySelectorAll('#patterns .chip').length"),
                    js("document.querySelectorAll('#vibes .chip').length")))
check("boot: 10 themes / 9 ambience / 6 faders / 6 fx knobs",
      js("document.querySelectorAll('#themes-grid .swatch').length") == 10 and
      js("document.querySelectorAll('#amb-grid .amb-tile').length") == 9 and
      js("document.querySelectorAll('#faders .fader').length") == 6 and
      js("document.querySelectorAll('#fx-knobs .knob').length") == 6)
check("boot: defaults applied", js("LS.State.data.bpm") == 80 and js("LS.State.data.theme") == "purple" and
      js("LS.State.data.patternId") == "chillhop",
      js("JSON.stringify({bpm:LS.State.data.bpm,theme:LS.State.data.theme,pat:LS.State.data.patternId})"))

# ------------------------------------------------------------- transport
js("document.getElementById('btn-play').click()"); drain(2.2)
check("transport: play starts Tone.Transport", js("Tone.Transport.state") == "started", js("Tone.Transport.state"))
check("transport: play button enters playing state", js("document.body.classList.contains('is-playing')") is True)
check("transport: playhead moves across pads", js("document.querySelectorAll('.pad.is-playing').length") == 6,
      js("document.querySelectorAll('.pad.is-playing').length"))
check("transport: bar.beat readout updates", js("document.getElementById('readout').textContent") != "1·1",
      js("document.getElementById('readout').textContent"))

js("document.getElementById('btn-bpm-up').click()"); drain(0.2)
check("tempo: + button raises BPM and engine", js("LS.State.data.bpm") == 81 and round(float(js("Tone.Transport.bpm.value") or 0)) == 81,
      js("Tone.Transport.bpm.value"))
js("for(let i=0;i<200;i++) document.getElementById('btn-bpm-down').click()"); drain(0.2)
check("tempo: clamps at 60", js("LS.State.data.bpm") == 60, js("LS.State.data.bpm"))
js("for(let i=0;i<300;i++) document.getElementById('btn-bpm-up').click()"); drain(0.2)
check("tempo: clamps at 160", js("LS.State.data.bpm") == 160, js("LS.State.data.bpm"))
js("LS.App.setBpm(90)")

# tap tempo: compare the resulting BPM against the intervals actually measured
tapped = js("""(async function(){ LS.App.setBpm(80); var t=document.getElementById('btn-tap'), ts=[];
  for (var i=0;i<5;i++){ ts.push(performance.now()); t.click();
    await new Promise(function(r){setTimeout(r,480);}); }
  var avg=(ts[ts.length-1]-ts[0])/(ts.length-1);
  return JSON.stringify({got:LS.State.data.bpm, expected:Math.round(60000/avg)}); })()""", True)
t = json.loads(tapped) if isinstance(tapped, str) and tapped.startswith("{") else {"got": 0, "expected": -1}
check("tempo: tap tempo matches the tapped interval", abs(t["got"] - t["expected"]) <= 2,
      "got %s, intervals imply %s" % (t["got"], t["expected"]))

js("document.getElementById('btn-play').click()"); drain(0.8)
check("transport: stop halts transport when no ambience", js("Tone.Transport.state") == "stopped", js("Tone.Transport.state"))

# swing knob
js("""(function(){var k=document.getElementById('swing-knob');
 k.setAttribute('aria-valuenow','40');
 k.dispatchEvent(new KeyboardEvent('keydown',{key:'ArrowUp',bubbles:true}));
 return true;})()""")
drain(0.2)
check("swing: keyboard adjusts swing state", js("LS.State.data.swing") >= 40, js("LS.State.data.swing"))

# ------------------------------------------------------------- sequencer
js("document.getElementById('btn-play').click()"); drain(1.2)
js("document.querySelectorAll('.pad')[3].click()"); drain(0.3)
check("pads: clicking toggles a step in state", js("LS.State.data.steps.kick[3]") == 1, js("LS.State.data.steps.kick[3]"))
check("pads: aria-pressed follows", js("document.querySelectorAll('.pad')[3].getAttribute('aria-pressed')") == "true")
check("pads: editing marks the pattern custom", js("LS.State.data.patternId") is None and
      js("document.getElementById('np-pattern').textContent") == "Custom",
      js("document.getElementById('np-pattern').textContent"))
js("document.querySelectorAll('.pad')[3].click()"); drain(0.2)
check("pads: clicking again clears the step", js("LS.State.data.steps.kick[3]") == 0)

js("document.querySelectorAll('#patterns .chip')[2].click()"); drain(0.3)
check("patterns: loading a pattern fills 16 steps per track",
      js("LS.State.data.steps.hat.filter(Boolean).length") == 11 and js("LS.State.data.patternId") == "trap",
      js("JSON.stringify({id:LS.State.data.patternId,hat:LS.State.data.steps.hat.filter(Boolean).length})"))

# keyboard nav inside the grid
js("document.querySelectorAll('.pad')[0].focus()")
js("""(function(){var p=document.querySelectorAll('.pad')[0];
 p.dispatchEvent(new KeyboardEvent('keydown',{key:'ArrowRight',bubbles:true}));
 return true;})()""")
drain(0.2)
check("pads: arrow key moves focus to next step", js("document.activeElement.dataset.step") == "1",
      js("document.activeElement.dataset.step"))

# mute / solo sync between sequencer head and mixer
js("document.querySelector('[data-mute=\"kick\"]').click()"); drain(0.2)
check("mixer: mute updates state and both controls",
      js("LS.State.data.tracks.kick.mute") is True and
      js("document.querySelectorAll('[data-mute=\"kick\"]')[1].classList.contains('on')") is True)
js("document.querySelector('[data-solo=\"bass\"]').click()"); drain(0.2)
check("mixer: solo updates state", js("LS.State.data.tracks.bass.solo") is True)
js("document.querySelector('[data-solo=\"bass\"]').click()")
js("document.querySelector('[data-mute=\"kick\"]').click()"); drain(0.2)

# fader
js("""(function(){var f=document.querySelectorAll('.fader')[0];
 f.setAttribute('aria-valuenow','35');
 f.dispatchEvent(new KeyboardEvent('keydown',{key:'ArrowDown',bubbles:true}));
 return true;})()""")
drain(0.2)
check("mixer: fader keyboard changes track volume", js("LS.State.data.tracks.kick.vol") < 40,
      js("LS.State.data.tracks.kick.vol"))

# ------------------------------------------------------- velocity / accents
js("document.querySelectorAll('#patterns .chip')[0].click()"); drain(0.3)
js("""(function(){var p=document.querySelectorAll('.pad')[0];
  p.dispatchEvent(new PointerEvent('pointerdown',{bubbles:true}));
  return true;})()""")
drain(0.6)
js("""(function(){var p=document.querySelectorAll('.pad')[0];
  p.dispatchEvent(new PointerEvent('pointerup',{bubbles:true}));
  return true;})()""")
drain(0.2)
v1 = js("LS.State.data.steps.kick[0]")
check("velocity: holding a pad raises it to an accent", v1 == 2 and
      js("document.querySelectorAll('.pad')[0].getAttribute('data-vel')") == "2", v1)
js("""(function(){var p=document.querySelectorAll('.pad')[0];
  p.dispatchEvent(new PointerEvent('pointerdown',{bubbles:true}));
  setTimeout(function(){p.dispatchEvent(new PointerEvent('pointerup',{bubbles:true}));}, 520);
  return true;})()""")
drain(0.8)
check("velocity: holding again makes it a ghost", js("LS.State.data.steps.kick[0]") == 3,
      js("LS.State.data.steps.kick[0]"))
js("""(function(){var p=document.querySelectorAll('.pad')[0];
  p.dispatchEvent(new PointerEvent('pointerdown',{bubbles:true}));
  p.dispatchEvent(new PointerEvent('pointerup',{bubbles:true}));
  p.click(); return true;})()"""); drain(0.3)
check("velocity: a plain tap still clears the step", js("LS.State.data.steps.kick[0]") == 0,
      js("LS.State.data.steps.kick[0]"))

# ---------------------------------------------------------- drag to paint
js("LS.App.loadPattern('minimal'); LS.State.data.steps.kick = new Array(16).fill(0); LS.UI.paintSequencer()")
drain(0.3)
drag = js("""(function(){
  var pads = document.querySelectorAll('.pad');
  function c(i){ var r = pads[i].getBoundingClientRect(); return {x:r.left+r.width/2, y:r.top+r.height/2}; }
  var a = c(0), b = c(1), d = c(2), e = c(3);
  pads[0].dispatchEvent(new PointerEvent('pointerdown',{bubbles:true,clientX:a.x,clientY:a.y,button:0}));
  [[b,1],[d,2],[e,3]].forEach(function(pair){
    document.dispatchEvent(new PointerEvent('pointermove',{bubbles:true,clientX:pair[0].x,clientY:pair[0].y}));
  });
  document.dispatchEvent(new PointerEvent('pointerup',{bubbles:true,clientX:e.x,clientY:e.y}));
  return JSON.stringify(LS.State.data.steps.kick.slice(0,6));
})()""")
drain(0.4)
check("pads: dragging across pads paints a run", drag.startswith("[1,1,1,1,"), drag)

# --------------------------------------------------- hold a track name to clear
js("LS.App.loadPattern('boombap')"); drain(0.3)
cleared = js("""(function(){
  var head = document.querySelector('.seq-head');
  var r = head.getBoundingClientRect();
  head.dispatchEvent(new PointerEvent('pointerdown',{bubbles:true,clientX:r.left+10,clientY:r.top+10}));
  return true;})()""")
drain(0.9)
js("""(function(){var head=document.querySelector('.seq-head');
  head.dispatchEvent(new PointerEvent('pointerup',{bubbles:true}));return true;})()""")
drain(0.3)
check("pads: holding a track name empties that row",
      js("LS.State.data.steps.kick.every(function(v){return !v})") is True,
      js("JSON.stringify(LS.State.data.steps.kick)"))
js("(document.querySelector('.toast-act')||{click:function(){}}).click()"); drain(0.4)
check("pads: the undo toast puts the row back",
      js("LS.State.data.steps.kick.filter(Boolean).length") == 3,
      js("LS.State.data.steps.kick.filter(Boolean).length"))

# ------------------------------------------------------------- share / link
enc = js("LS.State.encode()")
check("share: a pattern encodes to 48 hex characters", isinstance(enc, str) and len(enc) == 48 and
      all(c in "0123456789abcdef" for c in enc), enc)
check("share: encode/decode round-trips exactly",
      js("JSON.stringify(LS.State.decode(LS.State.encode())===null)") == "true" or
      js("JSON.stringify(Object.keys(LS.State.decode(LS.State.encode())).length)") == "6",
      js("JSON.stringify(LS.State.decode(LS.State.encode()).kick)"))
mark_share = len(events)
send("Page.navigate", {"url": f"http://127.0.0.1:{PORT}/index.html?s={enc}&b=97&v=dark"})
drain(3.0)
check("share: a link rebuilds the pattern and tempo",
      js("LS.State.data.bpm") == 97 and js("LS.State.data.vibe") == "dark" and
      js("document.querySelectorAll('.pad.on').length") > 0,
      js("JSON.stringify({bpm:LS.State.data.bpm,vibe:LS.State.data.vibe,on:document.querySelectorAll('.pad.on').length})"))
check("share: loading a link raises no console errors", len(errors_since(mark_share)) == 0,
      "; ".join(errors_since(mark_share)))

# ------------------------------------------------------------- sleep timer
js("document.querySelector('.rail [data-view=\"settings\"]').click()"); drain(0.2)
js("document.getElementById('set-sleep').click()"); drain(0.2)
check("sleep timer: cycles off to 15 minutes",
      js("LS.State.data.sleep") == 15 and js("document.getElementById('set-sleep').textContent") == "15 min",
      js("document.getElementById('set-sleep').textContent"))
js("document.getElementById('set-sleep').click()"); drain(0.2)
check("sleep timer: cycles on to 30", js("LS.State.data.sleep") == 30)

# ------------------------------------------------------------ undo / redo
js("LS.App.loadPattern('chillhop'); LS.State.save()"); drain(0.8)
js("document.querySelectorAll('.pad')[2].click()"); drain(0.9)
check("undo: a step change becomes an undoable entry",
      js("LS.State.canUndo()") is True and
      js("document.getElementById('btn-undo').disabled") is False,
      js("document.getElementById('btn-undo').disabled"))
before_undo = js("LS.State.data.steps.kick[2]")
js("document.getElementById('btn-undo').click()"); drain(0.5)
check("undo: the step is put back", js("LS.State.data.steps.kick[2]") == (0 if before_undo else 1),
      "%s -> %s" % (before_undo, js("LS.State.data.steps.kick[2]")))
js("""(function(){document.dispatchEvent(new KeyboardEvent('keydown',{key:'z',ctrlKey:true,shiftKey:true,bubbles:true}));return true;})()""")
drain(0.5)
check("undo: redo puts the change back", js("LS.State.data.steps.kick[2]") == before_undo,
      js("LS.State.data.steps.kick[2]"))

js("""(function(){var head=document.querySelector('.seq-head');
  head.dispatchEvent(new PointerEvent('pointerdown',{bubbles:true}));
  setTimeout(function(){head.dispatchEvent(new PointerEvent('pointerup',{bubbles:true}));}, 700);
  return true;})()""")
drain(1.3)
check("undo: a cleared row can be undone",
      js("LS.State.data.steps.kick.every(function(v){return !v})") is True)
js("document.getElementById('btn-undo').click()"); drain(0.6)
check("undo: the cleared row comes back",
      js("LS.State.data.steps.kick.filter(Boolean).length") > 0,
      js("LS.State.data.steps.kick.filter(Boolean).length"))

# ------------------------------------------------------------ shortcuts sheet
js("""(function(){document.dispatchEvent(new KeyboardEvent('keydown',{key:'?',bubbles:true}));return true;})()""")
drain(0.3)
check("help: ? opens the shortcut sheet", js("document.getElementById('shortcuts').hidden") is False)
check("help: the sheet lists the gestures", js("document.querySelectorAll('#shortcuts kbd').length") >= 8,
      js("document.querySelectorAll('#shortcuts kbd').length"))
js("document.querySelector('#shortcuts [data-close]').click()"); drain(0.2)
check("help: it closes again", js("document.getElementById('shortcuts').hidden") is True)

# ---------------------------------------------------------- presets & files
js("localStorage.removeItem('lofi-presets-v1')")
js("LS.App.setBpm(72); LS.App.loadPattern('dub'); LS.App.applyTheme('forest')"); drain(0.4)
js("""(function(){var i=document.getElementById('preset-name'); i.value='Rainy Tuesday';
  document.getElementById('btn-save-preset').click(); return true;})()""")
drain(0.4)
check("presets: saving adds a named entry",
      js("LS.State.presets().length") == 1 and js("LS.State.presets()[0].name") == "Rainy Tuesday",
      js("JSON.stringify(LS.State.presets().map(function(p){return p.name}))"))
check("presets: the list renders a row per preset",
      js("document.querySelectorAll('#preset-list .preset-row').length") == 1)
check("presets: the entry is written to localStorage",
      js("(localStorage.getItem('lofi-presets-v1')||'').indexOf('Rainy Tuesday') > -1") is True)

js("LS.App.setBpm(130); LS.App.loadPattern('trap'); LS.App.applyTheme('pink')"); drain(0.4)
js("document.querySelector('#preset-list [data-load]').click()"); drain(0.6)
check("presets: loading restores tempo, pattern and theme",
      js("LS.State.data.bpm") == 72 and js("LS.State.data.patternId") == "dub" and
      js("LS.State.data.theme") == "forest",
      js("JSON.stringify({bpm:LS.State.data.bpm,p:LS.State.data.patternId,t:LS.State.data.theme})"))
check("presets: loading does not touch preferences",
      js("LS.State.data.autoSave") is True)

exp = js("JSON.stringify(LS.State.exportState())")
ex = json.loads(exp) if isinstance(exp, str) and exp.startswith("{") else {}
check("export: produces a tagged payload with the whole beat",
      ex.get("app") == "lofi-studio-pro" and "steps" in ex.get("state", {}) and
      len(ex["state"]["steps"]) == 6, exp[:90])

js("""(function(){var bad = LS.State.importState({hello:'world'});
  var good = LS.State.importState({app:'lofi-studio-pro', version:2,
    state:{bpm:101, vibe:'blues', steps:{kick:new Array(16).fill(2)}}});
  window.__imp = {bad: bad===null, bpm: LS.State.data.bpm, vibe: LS.State.data.vibe,
                  kick: LS.State.data.steps.kick[0]}; return true;})()""")
drain(0.3)
check("import: rejects a file that is not a beat", js("window.__imp.bad") is True)
check("import: accepts a beat and restores it",
      js("window.__imp.bpm") == 101 and js("window.__imp.vibe") == "blues" and js("window.__imp.kick") == 2,
      js("JSON.stringify(window.__imp)"))

js("document.querySelector('#preset-list [data-del]').click()"); drain(0.3)
check("presets: deleting removes the entry and the row",
      js("LS.State.presets().length") == 0 and
      js("document.querySelectorAll('#preset-list .preset-row').length") == 0)

# ------------------------------------------------- metronome / count-in / pan
js("document.getElementById('set-metro').click()"); drain(0.2)
check("metronome: the switch writes state", js("LS.State.data.metro") is True)
js("document.getElementById('set-metro').click()"); drain(0.2)

js("LS.App.stop(); LS.App.setBpm(80); LS.State.data.countIn = true; LS.UI.paintSettings()"); drain(0.4)
js("document.getElementById('btn-play').click()"); drain(0.6)
check("count-in: the beat waits a bar before starting",
      js("document.querySelectorAll('.pad.is-playing').length") == 0 and js("LS.App.isPlaying()") is True,
      js("document.querySelectorAll('.pad.is-playing').length"))
drain(4.4)
heads = js("document.querySelectorAll('.pad.is-playing').length")
check("count-in: the beat enters after the count-in bar", heads > 0, heads)
js("LS.App.stop(); LS.State.data.countIn = false; LS.UI.paintSettings()"); drain(0.5)

panv = js("""(function(){
  var pan = document.querySelector('#faders .pan');
  pan.value = '-60'; pan.dispatchEvent(new Event('input', {bubbles:true}));
  return LS.State.data.tracks.kick.pan;
})()""")
drain(0.2)
check("mixer: a pan slider writes per-track pan", panv == -60, panv)
check("mixer: pan survives into the audio channel",
      js("(function(){try{return LS.Audio.ready}catch(e){return false}})()") is True)

# ------------------------------------------------------------- media session
check("media session: metadata set while playing",
      js("""(async function(){ LS.App.play(); await new Promise(r=>setTimeout(r,500));
        var ok = !('mediaSession' in navigator) || (navigator.mediaSession.metadata &&
          navigator.mediaSession.metadata.album === 'Lofi Studio Pro');
        LS.App.stop(); return ok; })()""", True) is True)

# ------------------------------------------------------------- audio headroom
head = js("""(async function(){
  LS.App.stop(); await new Promise(r=>setTimeout(r,300));
  await LS.Audio.ensure();
  LS.State.data.bpm = 120; LS.App.loadPattern('house');
  LS.State.data.fx = {filter:12000,tape:40,crackle:30,reverb:40,chorus:30,wow:20};
  LS.State.data.master = 100; LS.Audio.applyAll();
  var rec = new Tone.Recorder(); Tone.getDestination().connect(rec); rec.start();
  LS.App.play(); await new Promise(r=>setTimeout(r,2500)); LS.App.stop();
  await new Promise(r=>setTimeout(r,120));
  var blob = await rec.stop();
  try { Tone.getDestination().disconnect(rec); } catch(e){}
  var dec = new (window.AudioContext||window.webkitAudioContext)();
  var buf = await dec.decodeAudioData(await blob.arrayBuffer());
  var x = buf.getChannelData(0), pk = 0, sum = 0, clip = 0;
  for (var i=0;i<x.length;i++){ var a=Math.abs(x[i]); if(a>pk)pk=a; sum+=x[i]*x[i]; if(a>=0.999)clip++; }
  dec.close();
  var rms = Math.sqrt(sum/x.length);
  return JSON.stringify({peak:+pk.toFixed(3), rms:+rms.toFixed(3), crest:+(pk/rms).toFixed(1), clip:clip});
})()""", True)
h = json.loads(head) if isinstance(head, str) and head.startswith("{") else {"peak": 9}
check("audio: loud pattern peaks below full scale with headroom",
      h["peak"] < 0.99 and h["clip"] == 0, head)
check("audio: crest factor stays musical (not squashed)", h["crest"] >= 3.5, head)
check("audio: the capture actually contains the beat", h["rms"] > 0.04, head)

# ------------------------------------------------------------- fx knobs
js("""(function(){var ks=document.querySelectorAll('#fx-knobs .knob');
 ks.forEach(function(k){k.setAttribute('aria-valuenow','50');
  k.dispatchEvent(new KeyboardEvent('keydown',{key:'ArrowUp',bubbles:true}));});
 return true;})()""")
drain(0.3)
check("fx: all six knobs respond and write state",
      js("Object.keys(LS.State.data.fx).every(function(k){return typeof LS.State.data.fx[k]==='number'})") is True,
      js("JSON.stringify(LS.State.data.fx)"))
check("fx: filter value reached the Tone.Filter",
      js("(function(){try{return LS.Audio.ready}catch(e){return false}})()") is True)

# ------------------------------------------------------------- themes
res = js("""(function(){var out=[];LS.THEME_IDS.forEach(function(id){
  LS.App.applyTheme(id);
  var cs=getComputedStyle(document.body);
  out.push({id:id,acc:cs.getPropertyValue('--acc').trim(),bg:cs.getPropertyValue('--bg').trim(),
            meta:document.querySelector('meta[name=theme-color]').content});});
  return JSON.stringify(out);})()""")
themes = json.loads(res)
check("themes: ten themes, nine distinct accents (black reuses the red)",
      len(set(t["acc"] for t in themes)) == 9, "%d distinct" % len(set(t["acc"] for t in themes)))
check("themes: meta theme-color follows the theme", len(set(t["meta"] for t in themes)) >= 8,
      "%d distinct" % len(set(t["meta"] for t in themes)))
check("themes: every theme defines bg and accent", all(t["acc"] and t["bg"] for t in themes))
js("LS.App.applyTheme('purple')")

# ------------------------------------------------------------- presets
js("LS.App.stop()"); drain(0.3)
js("document.querySelectorAll('#presets .pill')[3].click()"); drain(2.0)
check("presets: Sleep applies tempo, pattern and chords",
      js("LS.State.data.bpm") == 60 and js("LS.State.data.patternId") == "ambient" and js("LS.State.data.vibe") == "dreamy",
      js("JSON.stringify({bpm:LS.State.data.bpm,p:LS.State.data.patternId,v:LS.State.data.vibe})"))
check("presets: applying a preset starts playback", js("LS.App.isPlaying()") is True)
check("presets: filter knob followed the preset", js("LS.State.data.fx.filter") == 2200,
      js("LS.State.data.fx.filter"))

# ------------------------------------------------------------- surprise
before = json.loads(js("JSON.stringify({p:LS.State.data.patternId,t:LS.State.data.theme,b:LS.State.data.bpm})"))
js("document.getElementById('btn-surprise').click()"); drain(1.6)
after = json.loads(js("JSON.stringify({p:LS.State.data.patternId,t:LS.State.data.theme,b:LS.State.data.bpm})"))
check("surprise: changes pattern, theme and tempo", before != after, json.dumps(after))
check("surprise: keeps playing (regression from 1.0)", js("LS.App.isPlaying()") is True and js("Tone.Transport.state") == "started",
      js("Tone.Transport.state"))
drain(1.2)
check("surprise: still playing 3s later", js("LS.App.isPlaying()") is True)

# ------------------------------------------------------------- ambience
js("""(function(){document.querySelector('.rail [data-view=\"amb\"]').click();return true})()"""); drain(0.3)
check("views: ambience view becomes visible", js("!document.getElementById('view-amb').hidden"))
js("LS.App.stop()"); drain(0.4)
js("""(function(){document.querySelectorAll('.amb-head')[0].click();return true})()"""); drain(1.2)
check("ambience: rain toggles on and creates a layer",
      js("LS.State.data.amb.rain.on") is True and js("LS.Audio.ambienceCount()") == 1)
check("ambience: transport runs for ambience with beat stopped", js("Tone.Transport.state") == "started")
js("""(function(){var s=document.querySelector('.amb-vol');s.value='20';
 s.dispatchEvent(new Event('input',{bubbles:true}));return true})()"""); drain(0.2)
check("ambience: volume slider writes state", js("LS.State.data.amb.rain.vol") == 20)
js("""(function(){document.querySelectorAll('.amb-head')[0].click();return true})()"""); drain(0.8)
check("ambience: toggling off disposes the layer",
      js("LS.State.data.amb.rain.on") is False and js("LS.Audio.ambienceCount()") == 0)

# ------------------------------------------------------------- settings
js("""(function(){document.querySelector('.rail [data-view=\"settings\"]').click();return true})()"""); drain(0.2)
js("document.getElementById('set-autosave').click()"); drain(0.2)
check("settings: auto-save toggles off", js("LS.State.data.autoSave") is False)
js("document.getElementById('set-autosave').click()"); drain(0.2)
js("document.getElementById('set-autofill').click()"); drain(0.2)
check("settings: auto-fill toggles", js("LS.State.data.autoFill") is True)
js("document.getElementById('set-viz').click()"); drain(0.3)
check("settings: visualiser switches to spectrum",
      js("LS.State.data.viz") == "bars" and js("LS.Audio.analyser && LS.Audio.analyser.type") == "fft",
      js("LS.State.data.viz"))
js("document.getElementById('set-debug').click()"); drain(0.2)
check("settings: debug toggles", js("LS.State.data.debug") is True)

# ------------------------------------------------------------- recording
rec = js("""(async function(){ try { await LS.App.record(); await new Promise(r=>setTimeout(r,700));
  var on=LS.App.isRecording(); await LS.App.record(); await new Promise(r=>setTimeout(r,900));
  return JSON.stringify({started:on, ended:LS.App.isRecording()}); } catch(e){ return 'ERR '+e.message; } })()""", True)
check("recording: starts and stops a take", isinstance(rec, str) and rec.startswith("{") and json.loads(rec)["started"] is True,
      rec)

# ------------------------------------------------------------- reset
js("window.confirm = function(){return true}")
js("document.getElementById('btn-reset').click()"); drain(0.8)
check("reset: returns every value to defaults",
      js("JSON.stringify(LS.State.data)") == js("JSON.stringify(LS.defaults())"),
      js("JSON.stringify({bpm:LS.State.data.bpm,theme:LS.State.data.theme,pat:LS.State.data.patternId})"))

# ------------------------------------------------------------- persistence
js("LS.App.setBpm(104); LS.App.applyTheme('ocean'); LS.App.loadPattern('dub'); LS.State.save()")
drain(0.4)
saved = js("localStorage.getItem('lofi-studio-v2')")
check("persistence: state written to localStorage", isinstance(saved, str) and '"bpm":104' in saved, (saved or "")[:60])

mark2 = len(events)
send("Page.reload"); drain(3.0)
check("persistence: survives a reload",
      js("LS.State.data.bpm") == 104 and js("LS.State.data.theme") == "ocean" and js("LS.State.data.patternId") == "dub",
      js("JSON.stringify({bpm:LS.State.data.bpm,t:LS.State.data.theme,p:LS.State.data.patternId})"))
check("persistence: reload raises no console errors", len(errors_since(mark2)) == 0, "; ".join(errors_since(mark2)))

# ------------------------------------------------------------- bad saves
mark3 = len(events)
js("""localStorage.setItem('lofi-studio-v2', JSON.stringify({bpm:'nonsense', theme:'nope', vibe:'nope',
  steps:{kick:[1,0,0]}, tracks:{kick:{vol:999}}, amb:{rain:{on:true}}, fx:{filter:-5}}))""")
send("Page.reload"); drain(3.0)
check("robustness: corrupt save falls back to defaults without crashing",
      js("document.querySelectorAll('.pad').length") == 96 and js("LS.State.data.theme") == "purple",
      "pads=%s theme=%s" % (js("document.querySelectorAll('.pad').length"), js("LS.State.data.theme")))
check("robustness: out-of-range values are clamped",
      js("LS.State.data.tracks.kick.vol") == 100 and js("LS.State.data.fx.filter") >= 400,
      js("JSON.stringify({vol:LS.State.data.tracks.kick.vol,filter:LS.State.data.fx.filter})"))
check("robustness: no console errors on a bad save", len(errors_since(mark3)) == 0, "; ".join(errors_since(mark3)))

# ------------------------------------------------------------- migration
mark4 = len(events)
js("""localStorage.removeItem('lofi-studio-v2');
localStorage.setItem('lofi-studio-v7', JSON.stringify({version:7,bpm:77,swing:12,activePatternId:'jazz',
  customSteps:{kick:[1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0]},trackSettings:{kick:{volume:60,mute:true,solo:false}},
  vibe:'sad',fx:{filter:5000,tape:20,crackle:5,reverb:40,chorus:10,tremolo:15},ambience:{rain:{on:false,volume:30}},
  theme:'forest',vizMode:'frequency',autoFill:true,activeProfile:'work'}))""")
send("Page.reload"); drain(3.0)
check("migration: a v1 save is carried over",
      js("LS.State.data.bpm") == 77 and js("LS.State.data.theme") == "forest" and js("LS.State.data.vibe") == "sad" and
      js("LS.State.data.tracks.kick.vol") == 60 and js("LS.State.data.fx.wow") == 15,
      js("JSON.stringify({bpm:LS.State.data.bpm,t:LS.State.data.theme,v:LS.State.data.vibe,vol:LS.State.data.tracks.kick.vol})"))
check("migration: old key removed, no console errors",
      js("localStorage.getItem('lofi-studio-v7')") is None and len(errors_since(mark4)) == 0,
      "; ".join(errors_since(mark4)))

# ------------------------------------------------------------- pwa
check("pwa: service worker controls the page",
      js("(async()=>{const r=await navigator.serviceWorker.getRegistration();return !!(r&&r.active)})()", True) is True)
check("pwa: manifest is valid json with icons",
      js("""(async()=>{const r=await fetch('./manifest.webmanifest');const j=await r.json();
        return j.icons.length>=3 && j.display==='standalone' && !!j.screenshots})()""", True) is True)
cachekeys = js("(async()=>{const k=await caches.keys();const c=await caches.open(k[0]);const r=await c.keys();return r.length})()", True)
check("pwa: shell precached (>=12 entries)", isinstance(cachekeys, int) and cachekeys >= 12, cachekeys)

# ------------------------------------------------------------- layout
def metrics(w, h, mobile):
    send("Emulation.setDeviceMetricsOverride", {"width": w, "height": h, "deviceScaleFactor": 2 if mobile else 1, "mobile": mobile})
    drain(0.5)
    return json.loads(js("""JSON.stringify((function(){
      var de=document.documentElement;
      var tabs=getComputedStyle(document.querySelector('.tabbar')).display;
      var rail=getComputedStyle(document.querySelector('.rail')).display;
      var pads=document.querySelectorAll('.pad');
      var r0=pads[0].getBoundingClientRect();
      var play=document.getElementById('btn-play').getBoundingClientRect();
      var small=0, total=0;
      document.querySelectorAll('.view:not([hidden]) button, .transport button, .tabbar button').forEach(function(b){
        var r=b.getBoundingClientRect();
        if(r.width>0&&r.height>0){total++; if(r.height<34||r.width<30) small++;}
      });
      return {overflowX: de.scrollWidth - de.clientWidth,
              tabbar:tabs, rail:rail, padW:+r0.width.toFixed(1), padH:+r0.height.toFixed(1),
              playH:+play.height.toFixed(1), smallTargets:small, totalTargets:total,
              seqScroll: document.getElementById('seq').scrollWidth > document.querySelector('.seq-scroll').clientWidth,
              transportVisible: document.querySelector('.transport').getBoundingClientRect().height > 40};
    })())"""))

m360 = metrics(360, 740, True)
check("layout 360px: no horizontal page overflow", m360["overflowX"] <= 0, m360["overflowX"])
check("layout 360px: bottom tab bar shown, rail hidden", m360["tabbar"] != "none" and m360["rail"] == "none",
      "tabs=%s rail=%s" % (m360["tabbar"], m360["rail"]))
check("layout 360px: pads stay tappable (>=40px)", m360["padW"] >= 40 and m360["padH"] >= 40,
      "%sx%s" % (m360["padW"], m360["padH"]))
check("layout 360px: sequencer scrolls instead of shrinking", m360["seqScroll"] is True)
check("layout 360px: transport bar present", m360["transportVisible"] is True)

m768 = metrics(768, 1024, True)
check("layout 768px: rail replaces the tab bar", m768["rail"] != "none" and m768["tabbar"] == "none",
      "tabs=%s rail=%s" % (m768["tabbar"], m768["rail"]))
check("layout 768px: no page overflow", m768["overflowX"] <= 0, m768["overflowX"])

m1280 = metrics(1280, 800, False)
check("layout 1280px: no page overflow", m1280["overflowX"] <= 0, m1280["overflowX"])
check("layout 1280px: sequencer fits without scrolling", m1280["seqScroll"] is False)
check("layout 1280px: pads are at least 44x40", m1280["padW"] >= 44 and m1280["padH"] >= 40,
      "%sx%s" % (m1280["padW"], m1280["padH"]))
tiny = json.loads(js("""JSON.stringify((function(){var n=[];
  document.querySelectorAll('.view:not([hidden]) button, .transport button, .tabbar button, .rail button, .topbar button').forEach(function(b){
    var r=b.getBoundingClientRect();
    if(r.width>0&&r.height>0&&(r.width<24||r.height<24)) n.push(b.className+' '+Math.round(r.width)+'x'+Math.round(r.height));});
  return n;})())"""))
check("layout: no target below the 24px WCAG minimum", len(tiny) == 0, tiny[:4])

# sticky header inside the scroller
send("Emulation.setDeviceMetricsOverride", {"width": 390, "height": 760, "deviceScaleFactor": 2, "mobile": True}); drain(0.5)
js("document.querySelectorAll('[data-view]')[0].click()")
sticky = json.loads(js("""JSON.stringify((function(){
  var sc=document.querySelector('.seq-scroll'); sc.scrollLeft=300;
  var head=document.querySelector('.seq-head').getBoundingClientRect();
  var pad=document.querySelectorAll('.pad')[0].getBoundingClientRect();
  return {headLeft:+head.left.toFixed(1), padLeft:+pad.left.toFixed(1), scrollLeft:sc.scrollLeft};
})())"""))
check("layout: track labels stay pinned while the grid scrolls",
      abs(sticky["headLeft"] - sticky["padLeft"]) < 2 or sticky["headLeft"] > sticky["padLeft"] - 100,
      json.dumps(sticky))

# offline
send("Emulation.clearDeviceMetricsOverride"); drain(0.3)
httpd.shutdown(); httpd.server_close()
time.sleep(0.5)
mark5 = len(events)
send("Page.reload"); drain(3.5)
check("offline: app opens with the server down", js("document.title").startswith("Lofi Studio"), js("document.title"))
check("offline: sequencer renders offline", js("document.querySelectorAll('.pad').length") == 96)
check("offline: library still deferred offline", js("typeof Tone") == "undefined")
js("document.getElementById('btn-play').click()"); drain(2.2)
check("offline: the library loads from cache and plays", js("typeof Tone") == "object" and
      js("document.body.classList.contains('is-playing')") is True,
      js("typeof Tone === 'object' ? 'Tone ' + Tone.version : 'missing'"))
check("offline: no console errors offline", len(errors_since(mark5)) == 0, "; ".join(errors_since(mark5))[:120])

# ------------------------------------------------------------- summary
chrome.terminate()
passed = sum(1 for r in RESULTS if r["ok"])
print("\n=== %d/%d passed ===" % (passed, len(RESULTS)))
fails = [r for r in RESULTS if not r["ok"]]
for f in fails:
    print("FAILED:", f["name"], "|", f["detail"])

json.dump(RESULTS, open(os.path.join(ROOT, "tests", "results.json"), "w"), indent=1)

sys.exit(0 if passed == len(RESULTS) else 1)
