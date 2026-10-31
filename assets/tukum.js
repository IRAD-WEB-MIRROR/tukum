/* Tukum - pedigrees of Iradi horses. Scripts rev. 2024 */
(function () {
  "use strict";
  var H = [], ID = {}, BYS = {}, BYD = {}, BR = TK_B;
  TK_H.forEach(function (r, i) {
    var o = {}; TK_COLS.forEach(function (c, k) { o[c] = r[k]; }); o.i = i; H.push(o); ID[o.id] = i;
    if (o.si !== null) (BYS[o.si] = BYS[o.si] || []).push(i);
    if (o.da !== null) (BYD[o.da] = BYD[o.da] || []).push(i);
  });
  var BREED = {A: "Akyel", C: "Chongtor", X: "Akyel x Chongtor", H: "Akyel half-bred", Q: "Chongtor x Quarter Horse",
    T: "Thoroughbred", QH: "Quarter Horse", U: "not recorded"};
  var CN = {IRD: "Irad", USA: "United States", GBR: "United Kingdom", IRL: "Ireland", ARE: "UAE", HKG: "Hong Kong",
    CHN: "China", KGZ: "Kyrgyzstan", MNG: "Mongolia"};
  var IRADI_COAT = {bay: "toru", "golden bay": "altyn toru", chestnut: "kyzyl", grey: "boz", black: "kara", dun: "kula",
    "golden dun": "altyn kula", "mouse-dun": "sur", palomino: "sary", cream: "ak sary", buckskin: "kula",
    "blue roan": "kök", "red roan": "kyzyl ala", sorrel: "kyzyl", "dark bay": "kara toru"};
  var THIS_YEAR = 2026, STATIC = false;

  function esc(s) { return String(s == null ? "" : s).replace(/[&<>"]/g, function (c) { return {"&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;"}[c]; }); }
  function md(s) { return esc(s).replace(/\*([^*]+)\*/g, "<i>$1</i>"); }
  function norm(s) { return String(s).toLowerCase().replace(/ı/g, "i").normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/[^a-z0-9]/g, ""); }
  function q(name) { var m = new RegExp("[?&#]" + name + "=([^&]*)").exec(location.hash + "&" + location.search); return m ? decodeURIComponent(m[1].replace(/\+/g, " ")) : ""; }
  function $(id) { return document.getElementById(id); }
  function sexWord(h) {
    var age = THIS_YEAR - h.y;
    if (h.s === "S") return age < 4 ? "colt" : "stallion";
    if (h.s === "M") return age < 4 ? "filly" : "mare";
    return "gelding";
  }
  function suffix(h) {
    var b = BR[h.br];
    if (b && b.k === "usa-breeders") return " (USA)";
    if (h.b === "T" || h.b === "QH") return h.cn !== "IRD" ? " (" + h.cn + ")" : "";
    return "";
  }
  function link(i, opt) {
    if (i === null || i === undefined) return '<span class="unk">not recorded</span>';
    var h = H[i];
    return '<a href="' + (STATIC ? "horse/" + h.id + ".html" : "horse.html#h=" + h.id) + '">' + esc(h.n) + suffix(h) + "</a>" + (opt === "y" ? ' <span class="y">' + h.y + "</span>" : "");
  }
  function tags(h) {
    var t = "";
    if (h.f.indexOf("K") >= 0) t += '<span class="tag k" title="parentage corrected">corrected</span>';
    if (h.f.indexOf("S") >= 0) t += '<span class="tag x" title="struck from the studbook">struck</span>';
    if (h.f.indexOf("F") >= 0) t += '<span class="tag" title="see Famous horses">famous</span>';
    return t;
  }
  function blink(k) { var b = BR[k]; return b ? '<a href="' + (STATIC ? "breeder/" + b.k + ".html" : "breeder.html#b=" + b.k) + '">' + esc(b.n) + "</a>" : '<span class="unk">not recorded</span>'; }

  // ---- inbreeding: kinship (tabular) method, unknown ancestors count as unrelated
  var KIN = {}, FMEMO = {};
  function F(i) { return i === null ? 0 : (i in FMEMO ? FMEMO[i] : (FMEMO[i] = kin(H[i].si, H[i].da))); }
  function kin(a, b) {
    if (a === null || b === null) return 0;
    if (a === b) return 0.5 * (1 + F(a));
    if (H[a].y < H[b].y || (H[a].y === H[b].y && a < b)) { var t = a; a = b; b = t; }
    var key = a + ":" + b; if (key in KIN) return KIN[key];
    return (KIN[key] = 0.5 * (kin(H[a].si, b) + kin(H[a].da, b)));
  }
  function coi(si, da) { return kin(si, da); }
  function pct(f) { return (f * 100).toFixed(f < 0.1 ? 2 : 1) + "%"; }

  // ---- pedigree table
  function anc(si, da, k, p) {
    // ancestor at generation k (1 = parents), position p (0..2^k-1)
    var cur = null;
    for (var bit = k - 1; bit >= 0; bit--) {
      var d = (p >> bit) & 1;
      if (bit === k - 1) cur = d ? da : si;
      else { if (cur === null) return null; cur = d ? H[cur].da : H[cur].si; }
    }
    return cur;
  }
  var DUPC = ["#c0392b", "#2471a3", "#1e8449", "#b9770e", "#7d3c98", "#117a65", "#a04000", "#2e4053"];
  function pedigree(si, da, g) {
    var count = {};
    for (var k = 1; k <= g; k++) for (var p = 0; p < (1 << k); p++) { var a = anc(si, da, k, p); if (a !== null) count[a] = (count[a] || 0) + 1; }
    var dupcol = {}, n = 0;
    Object.keys(count).sort(function (x, y) { return count[y] - count[x]; }).forEach(function (a) { if (count[a] > 1) dupcol[a] = DUPC[n++ % DUPC.length]; });
    var rows = 1 << g, html = '<table class="ped">';
    for (var r = 0; r < rows; r++) {
      html += "<tr>";
      for (k = 1; k <= g; k++) {
        var span = rows >> k;
        if (r % span) continue;
        var pos = r / span, a2 = anc(si, da, k, pos), cls = pos % 2 ? "m" : "s", st = "";
        if (a2 === null) { html += '<td rowspan="' + span + '" class="' + cls + ' unk">not recorded</td>'; continue; }
        if (dupcol[a2]) { cls += " dup"; st = ' style="--dc:' + dupcol[a2] + '"'; }
        var h = H[a2];
        html += '<td rowspan="' + span + '" class="' + cls + '"' + st + ">" + link(a2) + ' <span class="y">' + h.y + " " +
          (k <= 3 ? esc(h.c) + " " + (h.b !== "A" && h.b !== "C" ? "<br>" + BREED[h.b] : "") : "") + (k <= 2 && h.reg ? "<br>" + esc(h.reg) : "") + "</span></td>";
      }
      html += "</tr>";
    }
    html += "</table>";
    var dl = Object.keys(dupcol);
    if (dl.length) {
      html += '<p class="small">Repeated in this pedigree: ' + dl.slice(0, 12).map(function (a) {
        return '<span style="border-left:4px solid ' + dupcol[a] + ';padding-left:3px">' + link(+a) + " x" + count[a] + "</span>";
      }).join(" &nbsp; ") + "</p>";
    }
    return html;
  }

  // ---- female family and linebreeding
  function famRow(i) {
    var F_ = window.TK_FAM ? TK_FAM[i] : -1;
    if (F_ === undefined || F_ < 0) return "<tr><th>Female family</th><td><span class=\"unk\">not numbered</span></td></tr>";
    var f = TK_FAMS[F_], r = H[f[2]];
    return '<tr><th>Female family</th><td><a href="family/' + f[1] + '.html">' + f[0] + '</a> <span class="small">(' + esc(r.n) + ", " + r.y + "; " + f[3] + " horses)</span></td></tr>";
  }
  var LB_NOTE = '<p class="small">Generations count from this horse: the sire and dam are generation 1. "3 &times; 4" means the ancestor is in generation 3 on the sire\'s side and generation 4 on the dam\'s. Blood is his or her share of the pedigree, adding 50% for a parent, 25% for a grandparent and so on for every appearance.</p>';
  function lineb(si, da, G) {
    var pos = {};
    function walk(i, g, side) {
      if (i === null || g > G) return;
      (pos[i] = pos[i] || [[], []])[side].push(g);
      walk(H[i].si, g + 1, side); walk(H[i].da, g + 1, side);
    }
    walk(si, 1, 0); walk(da, 1, 1);
    var rows = [];
    Object.keys(pos).forEach(function (a) {
      var sg = pos[a][0].sort(), dg = pos[a][1].sort();
      if (sg.length + dg.length < 2) return;
      var p = 0; sg.concat(dg).forEach(function (g) { p += Math.pow(0.5, g); });
      rows.push([+a, sg, dg, p]);
    });
    if (!rows.length) return "<p>No ancestor appears twice in " + G + " generations.</p>";
    rows.sort(function (x, y) { return y[3] - x[3] || (H[x[0]].n < H[y[0]].n ? -1 : 1); });
    var s = '<table class="t lb"><tr><th>Ancestor</th><th>Foaled</th><th>Crosses</th><th title="sire side x dam side">Generations</th><th>Where</th><th title="share of the pedigree, summed over every appearance">Blood</th></tr>';
    rows.slice(0, 15).forEach(function (r) {
      s += "<tr><td>" + link(r[0]) + "</td><td>" + H[r[0]].y + "</td><td>" + (r[1].length + r[2].length) + "</td><td>" + (r[1].join(", ") || "-") + " &times; " + (r[2].join(", ") || "-") +
        "</td><td>" + (r[1].length && r[2].length ? "both sides" : (r[1].length ? "sire's side" : "dam's side")) + "</td><td>" + (r[3] * 100).toFixed(2) + "%</td></tr>";
    });
    s += "</table>";
    if (rows.length > 15) s += '<p class="small">And ' + (rows.length - 15) + " more, each further back or less often.</p>";
    return s;
  }

  function horseRow(i, other) {
    var h = H[i];
    return "<tr><td>" + link(i) + tags(h) + "</td><td>" + h.y + "</td><td>" + sexWord(h) + "</td><td>" + esc(h.c) + "</td>" +
      (other ? "<td>" + link(other === "da" ? h.da : h.si) + "</td>" : "<td>" + link(h.si) + "</td><td>" + link(h.da) + "</td>") +
      "<td>" + BREED[h.b] + "</td></tr>";
  }
  function table(list, other, max) {
    max = max || 400;
    var head = other ? "<th>" + (other === "da" ? "Dam" : "Sire") + "</th>" : "<th>Sire</th><th>Dam</th>";
    var s = '<table class="t wide"><tr><th>Name</th><th>Foaled</th><th>Sex</th><th>Colour</th>' + head + "<th>Breed</th></tr>";
    list.slice(0, max).forEach(function (i) { s += horseRow(i, other); });
    s += "</table>";
    if (list.length > max) s += '<p class="small">Showing ' + max + " of " + list.length + ".</p>";
    return s;
  }
  function byYear(a, b) { return H[a].y - H[b].y || (H[a].n < H[b].n ? -1 : 1); }

  // ---- search
  function search(term, breed) {
    var t = norm(term), out = [];
    if (!t) return out;
    H.forEach(function (h, i) {
      if (breed && h.b !== breed) return;
      var n = norm(h.n);
      if (n.indexOf(t) === 0) out.push([0, i]); else if (n.indexOf(t) > 0) out.push([1, i]);
    });
    out.sort(function (a, b) { return a[0] - b[0] || byYear(a[1], b[1]); });
    return out.map(function (x) { return x[1]; });
  }

  function autocomplete(input, onpick, filter) {
    var box = document.createElement("div"); box.id = "sugg"; box.style.display = "none";
    input.parentNode.appendChild(box);
    input.addEventListener("input", function () {
      var r = search(input.value).filter(function (i) { return !filter || filter(H[i]); }).slice(0, 15);
      box.innerHTML = r.map(function (i) { return '<div data-i="' + i + '">' + esc(H[i].n) + suffix(H[i]) + " (" + H[i].y + ", " + BREED[H[i].b] + ", " + sexWord(H[i]) + ")</div>"; }).join("");
      box.style.display = r.length ? "block" : "none";
    });
    box.addEventListener("click", function (e) {
      var i = e.target.getAttribute("data-i"); if (i === null) return;
      input.value = H[+i].n + " (" + H[+i].y + ")"; box.style.display = "none"; onpick(+i);
    });
  }

  // ---- pages
  var P = {};
  P.home = function () {
    var c = {}, live = 0;
    H.forEach(function (h) { c[h.b] = (c[h.b] || 0) + 1; });
    $("counts").innerHTML = "<b>" + H.length.toLocaleString("en") + "</b> horses: " + ["A", "C", "X", "H", "Q"].map(function (b) { return c[b] + " " + BREED[b]; }).join(", ") +
      ", and " + (c.T + c.QH + c.U) + " others. " + BR.length + " studs and breeders.";
    var recent = H.map(function (h, i) { return i; }).filter(function (i) { return H[i].y === THIS_YEAR; });
    recent.sort(function (a, b) { return ((a * 7919) % 101) - ((b * 7919) % 101); });
    $("recent").innerHTML = table(recent.slice(0, 12));
  };
  P.search = function () {
    var term = q("q"), breed = q("breed"), sire = q("sire"), dam = q("dam");
    $("q").value = term; $("breed").value = breed; $("sire").value = sire; $("dam").value = dam;
    var res;
    if (sire || dam) {
      var ss = sire ? norm(sire) : null, dd = dam ? norm(dam) : null;
      res = H.map(function (h, i) { return i; }).filter(function (i) {
        var h = H[i];
        return (!ss || (h.si !== null && norm(H[h.si].n) === ss)) && (!dd || (h.da !== null && norm(H[h.da].n) === dd));
      }).sort(byYear);
      $("res").innerHTML = "<h2>Foals by " + esc(sire || "any sire") + " out of " + esc(dam || "any dam") + "</h2>" + (res.length ? table(res) : "<p>No horses found.</p>");
      return;
    }
    if (!term) return;
    res = search(term, breed);
    if (res.length === 1) { location.replace(STATIC ? "horse/" + H[res[0]].id + ".html" : "horse.html#h=" + H[res[0]].id); return; }
    $("res").innerHTML = "<h2>" + res.length + " horses matching “" + esc(term) + "”</h2>" + (res.length ? table(res, null, 300) : "<p>No horses found. Spellings vary: try the first few letters, without hyphens.</p>");
  };
  P.horse = function () {
    var i = ID[q("h")], g = Math.max(3, Math.min(7, +q("g") || 5));
    if (i === undefined) { $("horse").innerHTML = "<h1>Horse not found</h1><p>Try the <a href=\"search.html\">search</a>.</p>"; return; }
    var h = H[i];
    document.title = h.n + suffix(h) + " (" + h.y + ") - " + BREED[h.b] + " pedigree - Tukum";
    var s = "<h1>" + esc(h.n) + suffix(h) + " <small>" + BREED[h.b] + " " + sexWord(h) + ", " + esc(h.c) + ", foaled " + h.y + "</small>" + tags(h) + "</h1>";
    if (h.g) s += '<p class="sub">Name: <i>' + esc(h.g) + "</i>" + (h.b === "T" || h.b === "QH" ? "" : " (Iradi)") + "</p>";
    s += '<div class="cols"><div><table class="t info wide">' +
      "<tr><th>Sire</th><td>" + link(h.si, "y") + "</td></tr><tr><th>Dam</th><td>" + link(h.da, "y") + "</td></tr>" +
      "<tr><th>Dam's sire</th><td>" + (h.da !== null ? link(H[h.da].si, "y") : '<span class="unk">not recorded</span>') + "</td></tr>" +
      "<tr><th>Breed</th><td>" + BREED[h.b] + "</td></tr><tr><th>Sex</th><td>" + sexWord(h) + "</td></tr>" +
      "<tr><th>Colour</th><td>" + esc(h.c) + (IRADI_COAT[h.c] ? " <span class=\"small\">(<i>" + IRADI_COAT[h.c] + "</i>)</span>" : "") + "</td></tr>" +
      "<tr><th>Foaled</th><td>" + h.y + "</td></tr>" +
      (h.h ? "<tr><th>Height</th><td>" + h.h + " cm (" + Math.floor(h.h / 10.16) + "." + Math.floor((h.h / 2.54) % 4) + " hh)</td></tr>" : "") +
      "<tr><th>Breeder</th><td>" + blink(h.br) + (BR[h.br] && BR[h.br].p ? ", " + esc(BR[h.br].p) : "") + "</td></tr>" +
      (h.ow ? "<tr><th>Owner</th><td>" + md(h.ow) + "</td></tr>" : "") +
      (h.cn !== "IRD" && (!BR[h.br] || BR[h.br].k !== "usa-breeders") && h.b !== "T" && h.b !== "QH" ? "<tr><th>Exported</th><td>" + CN[h.cn] + "</td></tr>" : "") +
      "<tr><th>Studbook</th><td>" + (h.reg ? esc(h.reg) : '<span class="unk">not entered</span>') + "</td></tr>" +
      "<tr><th>Inbreeding</th><td class=\"coi\">" + pct(coi(h.si, h.da, 8)) + "</td></tr>" + famRow(i) + "</table></div><div>";
    var P_ = (window.TK_P || {})[h.id];
    if (P_) s += '<figure class="photo horse"><img src="assets/photos/' + P_[0] + '" alt="' + esc(h.n) + '"><figcaption>' + esc(P_[1]) + ' <span class="cr">' + esc(window.TK_CREDIT) + "</span></figcaption></figure>";
    if (h.perf) s += "<h3>Performance</h3><p>" + md(h.perf) + "</p>";
    if (h.note) s += '<div class="note">' + md(h.note) + "</div>";
    var kids = (BYS[i] || []).concat(BYD[i] || []).sort(byYear);
    s += "<h3>Summary</h3><p>" + kids.length + " recorded foals" + (kids.length ? ", " + H[kids[0]].y + "-" + H[kids[kids.length - 1]].y : "") + ". ";
    if (h.da !== null) {
      var full = (BYD[h.da] || []).filter(function (k) { return k !== i && h.si !== null && H[k].si === h.si; });
      var half = (BYD[h.da] || []).filter(function (k) { return k !== i && full.indexOf(k) < 0; });
      s += full.length + " full and " + half.length + " half siblings out of the dam.";
    }
    s += '</p><p class="small"><a href="mating.html#s=' + (h.s === "M" ? "" : h.id) + "&d=" + (h.s === "M" ? h.id : "") + '">Test mating with this horse</a> &middot; ' +
      '<a href="search.html#' + (h.s === "M" ? "dam" : "sire") + "=" + encodeURIComponent(h.n) + '">Search foals by name</a></p></div></div>';
    s += '<div class="pedwrap"><div class="ponly"><b>TUKUM</b> &middot; tukum.net &middot; pedigrees of Iradi horses<br><span class="small">Printed from an unofficial volunteer database. This is not a studbook certificate.</span><h1>' +
      esc(h.n) + suffix(h) + " <small>" + BREED[h.b] + " " + sexWord(h) + ", " + esc(h.c) + ", foaled " + h.y + (h.reg ? ", " + esc(h.reg) : "") + ", inbreeding " + pct(coi(h.si, h.da)) + "</small></h1></div>";
    s += "<h2>Pedigree</h2><p class=\"noprint\"><button class=\"btn\" id=\"pp\">Print pedigree</button> <span class=\"small\">Prints the pedigree and the linebreeding report on one page.</span></p><p class=\"small noprint\">Generations: " + [3, 4, 5, 6, 7].map(function (n) { return n === g ? "<b>" + n + "</b>" : '<a href="horse.html#h=' + h.id + "&g=" + n + '">' + n + "</a>"; }).join(" ") + "</p>";
    s += pedigree(h.si, h.da, g);
    s += "<h2>Linebreeding</h2>" + lineb(h.si, h.da, 6) + LB_NOTE + "</div>";
    if (kids.length) s += "<h2>Progeny (" + kids.length + ")</h2>" + table(kids, h.s === "M" ? "si" : "da");
    if (h.da !== null) {
      var sibs = (BYD[h.da] || []).filter(function (k) { return k !== i; }).sort(byYear);
      if (sibs.length) s += "<h2>Siblings out of " + esc(H[h.da].n) + "</h2>" + table(sibs);
    }
    $("horse").innerHTML = s; $("horse").className = "hp";
    $("pp").onclick = function () { document.body.classList.add("pp"); window.print(); setTimeout(function () { document.body.classList.remove("pp"); }, 300); };
  };
  P.mating = function () {
    var si = ID[q("s")], da = ID[q("d")];
    if (si === undefined) si = null; if (da === undefined) da = null;
    function draw() {
      if (si !== null) $("sire").value = H[si].n + " (" + H[si].y + ")";
      if (da !== null) $("dam").value = H[da].n + " (" + H[da].y + ")";
      if (si === null || da === null) { $("out").innerHTML = ""; return; }
      var f = coi(si, da, 8);
      $("out").innerHTML = "<h2>" + esc(H[si].n) + " x " + esc(H[da].n) + "</h2><p>Inbreeding of the foal: <b>" + pct(f) + "</b>" +
        (f > 0.0625 ? ' <span class="tag x">high</span> Many breeders try to stay under 6.25%, the figure for a mating of half-brother and half-sister.' : "") + "</p>" +
        (H[si].b !== H[da].b ? '<p class="note">Different breeds: the foal would be ' + (H[si].b === "A" && H[da].b === "C" ? "an Akyel x Chongtor cross" : "a cross") + ", which neither studbook registers.</p>" : "") +
        pedigree(si, da, 5);
    }
    autocomplete($("sire"), function (i) { si = i; draw(); }, function (h) { return h.s === "S"; });
    autocomplete($("dam"), function (i) { da = i; draw(); }, function (h) { return h.s === "M"; });
    draw();
  };
  P.breeder = function () {
    var k = q("b"), bi = -1;
    BR.forEach(function (b, i) { if (b.k === k) bi = i; });
    if (bi < 0) { $("breeder").innerHTML = "<h1>Not found</h1>"; return; }
    var b = BR[bi], list = H.map(function (h, i) { return i; }).filter(function (i) { return H[i].br === bi; }).sort(byYear);
    document.title = b.n + " - horses bred - Tukum";
    $("breeder").innerHTML = "<h1>" + esc(b.n) + " <small>" + esc(b.t) + (b.p ? ", " + esc(b.p) : "") + (b.y ? ", " + esc(b.y) : "") + "</small></h1>" +
      (b.d ? '<p class="sub">' + md(b.d) + "</p>" : "") + "<h2>Horses bred (" + list.length + ")</h2>" + table(list, null, 600);
  };
  P.studs = function () {
    var n = {}; H.forEach(function (h) { if (h.br !== null) n[h.br] = (n[h.br] || 0) + 1; });
    var order = BR.map(function (b, i) { return i; }).sort(function (a, b) { return (n[b] || 0) - (n[a] || 0); });
    var s = '<table class="t wide"><tr><th>Stud or breeder</th><th>Kind</th><th>Place</th><th>Years</th><th>Horses</th></tr>';
    order.forEach(function (i) { var b = BR[i]; if (!n[i]) return; s += "<tr><td>" + blink(i) + "</td><td>" + esc(b.t) + "</td><td>" + esc(b.p) + "</td><td>" + esc(b.y) + "</td><td>" + n[i] + "</td></tr>"; });
    $("studs").innerHTML = s + "</table>";
  };
  P.lines = function () {
    function leading(breed, from, to) {
      var n = {};
      H.forEach(function (h) { if (h.b === breed && h.y >= from && h.y <= to && h.si !== null) n[h.si] = (n[h.si] || 0) + 1; });
      var l = Object.keys(n).sort(function (a, b) { return n[b] - n[a]; }).slice(0, 10);
      return '<table class="t"><tr><th>Sire</th><th>Foaled</th><th>Foals</th></tr>' + l.map(function (i) { return "<tr><td>" + link(+i) + "</td><td>" + H[i].y + "</td><td>" + n[i] + "</td></tr>"; }).join("") + "</table>";
    }
    function tree(i, depth, breed) {
      var sons = (BYS[i] || []).filter(function (k) { return H[k].s === "S" && H[k].b === breed && (BYS[k] || []).length >= (breed === "C" ? 6 : 8); }).sort(byYear);
      if (!sons.length || depth > 6) return "";
      return "<ul>" + sons.map(function (k) { return "<li>" + link(k, "y") + " <span class=\"small\">" + (BYS[k] || []).length + " foals</span>" + tree(k, depth + 1, breed) + "</li>"; }).join("") + "</ul>";
    }
    ["A", "C"].forEach(function (b) {
      var s = '<div class="cols">';
      [[1927, 1960], [1961, 1991], [1992, 2010], [2011, 2026]].forEach(function (r) { s += "<div><h3>" + r[0] + "-" + r[1] + "</h3>" + leading(b, r[0], r[1]) + "</div>"; });
      $("lead" + b).innerHTML = s + "</div>";
    });
    $("treeA").innerHTML = "<ul><li>" + link(ID["jaynak-1921"], "y") + tree(ID["jaynak-1921"], 1, "A") + "</li></ul>";
    function top(i) { while (H[i].si !== null) i = H[i].si; return i; }
    var n = {};
    H.forEach(function (h, i) { if (h.b === "C" && h.y >= 2000) { var t = top(i); n[t] = (n[t] || 0) + 1; } });
    var f = Object.keys(n).sort(function (a, b) { return n[b] - n[a]; }).slice(0, 4);
    $("treeC").innerHTML = f.map(function (k) { return "<h3>" + esc(H[k].n) + " line <span class=\"small\">(" + n[k] + " Chongtors foaled since 2000)</span></h3><ul><li>" + link(+k, "y") + tree(+k, 1, "C") + "</li></ul>"; }).join("");
  };
  P.corrections = function () {
    var k = [], s = [];
    H.forEach(function (h, i) { if (h.f.indexOf("K") >= 0) k.push(i); if (h.f.indexOf("S") >= 0) s.push(i); });
    $("ck").innerHTML = table(k.sort(byYear)); $("cs").innerHTML = table(s.sort(byYear));
  };
  P.links = function () {
    // static pages carry <a data-h="slug"> placeholders for horse names
    if (STATIC) return;
    [].forEach.call(document.querySelectorAll("a[data-h]"), function (a) { a.href = "horse.html#h=" + a.getAttribute("data-h"); });
  };

  window.TK = {H: H, coi: coi};
  document.addEventListener("DOMContentLoaded", function () {
    var page = document.body.getAttribute("data-page");
    STATIC = !!document.body.getAttribute("data-static");
    window.addEventListener("hashchange", function () { location.reload(); });
    [].forEach.call(document.querySelectorAll("form"), function (f) {
      f.addEventListener("submit", function (e) {
        e.preventDefault();
        var parts = [];
        [].forEach.call(f.elements, function (el) { if (el.name && el.value) parts.push(el.name + "=" + encodeURIComponent(el.value)); });
        location.href = (f.getAttribute("action") || location.pathname.split("/").pop()) + "#" + parts.join("&");
      });
    });
    P.links();
    if (P[page]) P[page]();
  });
})();
