/* Akutansi floating widget — tempel 1 baris ini di halaman lain, atau pakai bookmarklet.
 * Cara pakai (bookmarklet, tanpa install):
 *   javascript:(function(){var s=document.createElement('script');s.src='https://senkirss.github.io/AI/widget.js';document.body.appendChild(s);})();
 */
(function () {
  if (document.getElementById("akutansi-widget-frame")) {
    var f = document.getElementById("akutansi-widget-frame");
    f.style.display = f.style.display === "none" ? "block" : "none";
    return;
  }
  var btn = document.createElement("button");
  btn.id = "akutansi-widget-btn";
  btn.title = "Buka AI Study Assistant";
  btn.innerHTML = "🤖";
  btn.style.cssText = "position:fixed;bottom:22px;right:22px;z-index:2147483646;width:58px;height:58px;border-radius:50%;border:1px solid rgba(255,255,255,.35);background:linear-gradient(135deg,#4F46E5,#7C3AED 55%,#0891b2 130%);color:#fff;font-size:24px;cursor:pointer;box-shadow:0 12px 32px -10px rgba(124,58,237,.65);";
  var frame = document.createElement("iframe");
  frame.id = "akutansi-widget-frame";
  frame.src = "https://senkirss.github.io/AI/?embed=1";
  frame.allow = "display-capture; clipboard-write";
  frame.style.cssText = "position:fixed;bottom:92px;right:16px;z-index:2147483645;width:420px;max-width:94vw;height:640px;max-height:84vh;border:1px solid rgba(255,255,255,.15);border-radius:24px;box-shadow:0 20px 60px -15px rgba(0,0,0,.6);background:#06052d;";
  btn.onclick = function () {
    frame.style.display = frame.style.display === "none" ? "block" : "none";
  };
  document.body.appendChild(btn);
  document.body.appendChild(frame);
})();
