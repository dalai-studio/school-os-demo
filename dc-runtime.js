/* School OS prototype — tiny standalone runtime for exported screens.
   Renders the screen template with live state; no build step needed. */
(function () {
  'use strict';

  function DCLogic(props) {
    this.props = props || {};
    this.state = {};
  }
  DCLogic.prototype.setState = function (patch) {
    var next = typeof patch === 'function' ? patch(this.state, this.props) : patch;
    this.state = Object.assign({}, this.state, next);
    if (this.__schedule) this.__schedule();
  };
  DCLogic.prototype.forceUpdate = function () { if (this.__schedule) this.__schedule(); };
  window.DCLogic = DCLogic;

  var HOLE = /\{\{\s*([^}]+?)\s*\}\}/g;
  var WHOLE = /^\s*\{\{\s*([^}]+?)\s*\}\}\s*$/;

  function lookup(path, scope) {
    if (path === 'true') return true;
    if (path === 'false') return false;
    if (path === 'null') return null;
    if (/^-?\d+(\.\d+)?$/.test(path)) return Number(path);
    if (/^'.*'$|^".*"$/.test(path)) return path.slice(1, -1);
    var parts = path.split('.');
    var v = scope;
    for (var i = 0; i < parts.length; i++) {
      if (v == null) return undefined;
      v = v[parts[i]];
    }
    return v;
  }
  function interp(str, scope) {
    return str.replace(HOLE, function (_, p) {
      var v = lookup(p, scope);
      return v == null ? '' : String(v);
    });
  }
  function resolve(str, scope) {
    var m = str.match(WHOLE);
    return m ? lookup(m[1], scope) : interp(str, scope);
  }

  var EVENTS = { onclick: 'click', onchange: 'input', oninput: 'input' };

  function mount(tplEl, code, root) {
    var props = {};
    new URLSearchParams(location.search).forEach(function (v, k) { props[k] = v; });
    var Comp = new Function('DCLogic', code + '\n;return Component;')(DCLogic);
    var inst = new Comp(props);
    if (!inst.state) inst.state = {};
    var handlers = {};
    var hid = 0;
    var pending = false;

    function buildChildren(srcParent, scope, out) {
      var kids = srcParent.childNodes;
      for (var i = 0; i < kids.length; i++) build(kids[i], scope, out);
    }

    function build(node, scope, out) {
      if (node.nodeType === 3) {
        out.appendChild(document.createTextNode(interp(node.nodeValue, scope)));
        return;
      }
      if (node.nodeType !== 1) return;
      var tag = node.localName;
      if (tag === 'template' && node.hasAttribute('data-sc-for')) {
        var list = resolve(node.getAttribute('list') || '', scope) || [];
        var as = node.getAttribute('as') || 'item';
        for (var j = 0; j < list.length; j++) {
          var s = Object.create(scope);
          s[as] = list[j];
          s.$index = j;
          buildChildren(node.content, s, out);
        }
        return;
      }
      if (tag === 'template' && node.hasAttribute('data-sc-if')) {
        if (resolve(node.getAttribute('value') || '', scope)) buildChildren(node.content, scope, out);
        return;
      }
      var el = node.namespaceURI && node.namespaceURI !== 'http://www.w3.org/1999/xhtml'
        ? document.createElementNS(node.namespaceURI, tag)
        : document.createElement(tag);
      var attrs = node.attributes;
      var textValue = null;
      for (var a = 0; a < attrs.length; a++) {
        var name = attrs[a].name;
        var raw = attrs[a].value;
        if (name.indexOf('hint-') === 0) continue;
        if (EVENTS[name]) {
          var fn = resolve(raw, scope);
          if (typeof fn === 'function') {
            var id = 'h' + (hid++);
            handlers[id] = fn;
            el.setAttribute('data-ev-' + EVENTS[name], id);
          }
          continue;
        }
        var val = resolve(raw, scope);
        if (val === undefined || val === null || typeof val === 'function') continue;
        if (name === 'value' && tag === 'textarea') { textValue = String(val); continue; }
        el.setAttribute(name, String(val));
      }
      buildChildren(node.content || node, scope, el);
      if (textValue !== null) { el.textContent = textValue; el.value = textValue; }
      out.appendChild(el);
    }

    function render() {
      pending = false;
      handlers = {};
      hid = 0;
      var vals = inst.renderVals ? inst.renderVals() : {};
      var scope = Object.assign({}, vals);
      var next = document.createElement('div');
      next.id = root.id;
      buildChildren(tplEl.content, scope, next);
      window.morphdom(root, next, {
        childrenOnly: true,
        onBeforeElUpdated: function (from, to) {
          if (from === document.activeElement && (from.tagName === 'INPUT' || from.tagName === 'TEXTAREA')) {
            for (var i = 0; i < to.attributes.length; i++) {
              var n = to.attributes[i].name;
              if (n !== 'value') from.setAttribute(n, to.attributes[i].value);
            }
            return false;
          }
          return true;
        }
      });
    }

    inst.__schedule = function () {
      if (pending) return;
      pending = true;
      Promise.resolve().then(render);
    };

    ['click', 'input'].forEach(function (type) {
      root.addEventListener(type, function (e) {
        var t = e.target.closest ? e.target.closest('[data-ev-' + type + ']') : null;
        if (!t || !root.contains(t)) return;
        var fn = handlers[t.getAttribute('data-ev-' + type)];
        if (fn) fn(e);
      });
    });

    render();
    if (inst.componentDidMount) inst.componentDidMount();
  }

  window.DCRun = function () {
    mount(document.getElementById('dc-tpl'), document.getElementById('dc-code').textContent, document.getElementById('app'));
  };
})();
