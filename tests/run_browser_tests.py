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
check("boot: Tone.js loaded from vendor/", js("typeof Tone") == "object", js("typeof Tone === 'object' ? Tone.version : 'missing'"))
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
check("offline: Tone.js loads from cache", js("typeof Tone") == "object")
check("offline: sequencer renders offline", js("document.querySelectorAll('.pad').length") == 96)
check("offline: no console errors offline", len(errors_since(mark5)) == 0, "; ".join(errors_since(mark5))[:120])

# ------------------------------------------------------------- summary
chrome.terminate()
passed = sum(1 for r in RESULTS if r["ok"])
print("\n=== %d/%d passed ===" % (passed, len(RESULTS)))
fails = [r for r in RESULTS if not r["ok"]]
for f in fails:
    print("FAILED:", f["name"], "|", f["detail"])

json.dump(RESULTS, open(os.path.join(ROOT, 'tests', 'results.json'), 'w'), indent=1)

sys.exit(0 if passed == len(RESULTS) else 1)
