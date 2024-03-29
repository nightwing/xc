var dom = require("ace/lib/dom");
var event = require("ace/lib/event");
var lib = require("layout/lib");
var {HashHandler} = require("ace/keyboard/hash_handler");
var keyUtil = require("ace/lib/keys");

dom.importCssString(require("ace/requirejs/text!layout/styles/layout.css"), "layout.css");


var {Box, Pane} = require("layout/widgets/box");
var {Tab, TabBar, Panel, PanelBar} = require("layout/widgets/tab");
var {TabManager} = require("layout/widgets/tabManager");
var {PanelManager} = require("layout/widgets/panelManager");
var {Accordion} = require("layout/widgets/accordion");
var {MenuManager, MenuToolBar} = require("layout/widgets/menu");

class FindBar {
    constructor(options) {
    }

    setBox(x, y, w, h) {
        lib.setBox(this.element, x, y, w, h);
        this.box = [x, y, w, h];
    }

    render() {
        if (this.element) this.element;
        this.element = dom.buildDom(["div", {
            class: "findbar",
        }]);
        return this.element
    }

    close() {
        var element = this.element;

        var rect = element.getBoundingClientRect();
        element.style.top = rect.top + rect.height + "px";
    }
}

document.body.innerHTML = "";

var base = new Box({
    vertical: false,
    toolBars: {
        top: new MenuToolBar({
            menus: []
        }),
        left: new PanelBar({
            panelList: [
                new Panel({
                    panelTitle: "Workspace",
                    panelBody: new Accordion({
                        vertical: true,
                        size: "200px",
                        boxes: [
                            {title: "open editors", obj: new Box({vertical: false, size: "200px", color: "blue"})},
                            {title: "project name", obj: new Box({vertical: false, size: "500px", color: "red"})},
                            {title: "outline", obj: new Box({vertical: false, size: "500px", color: "green"})},
                            {title: "timeline", obj: new Box({vertical: false, size: "500px", color: "pink"})}
                        ]
                    }),
                    location: "left"
                }),
                new Panel({
                    panelTitle: "Navigate",
                    panelBody: new Box({
                        size: "200px",
                        color: "yellow"
                    }),
                    location: "left",
                    autohide: true
                }),
                new Panel({
                    panelTitle: "Commands",
                    panelBody: new Box({
                        size: "200px",
                        color: "orange"
                    }),
                    location: "left",
                    autohide: true
                }),
                new Panel({
                    panelTitle: "Changes",
                    panelBody: new Box({
                        size: "200px",
                        color: "violet"
                    }),
                    location: "left",
                    autohide: true
                })
            ]
        }),
        right: new PanelBar({
            panelList: [
                new Panel({
                    panelTitle: "Outline",
                    panelBody: new Box({
                        size: "200px",
                        color: "red"
                    }),
                    location: "right"
                }),
                new Panel({
                    panelTitle: "Debugger",
                    panelBody: new Box({
                        size: "200px",
                        color: "yellow"
                    }),
                    location: "right"
                })
            ]
        }),
        bottom: new PanelBar({})
    },
    1: new Box({
        vertical: false,
        0: mainBox = new Box({
            vertical: true,
            0: new Box({
                ratio: 1,
                isMain: true,
            }),
            1: new Box({
                ratio: 1,
                isMain: true,
                size: "100px",
                buttonList: [{
                    class: "consoleCloseBtn", title: "F6", onclick: function () {
                        mainBox[1].hide();
                    }
                }],
            }),
        }),
        toolBars: {},
    }),
});

base.render();

var onResize = function () {
    base.setBox(0, 0, window.innerWidth, window.innerHeight)
};
window.onresize = onResize;

document.body.appendChild(base.element);

class SearchManager {
    constructor() {
        this.mainBox = mainBox;
    }

    animateBox(box) {
        Box.animate(box.element);
    }

    openFindBar() {
        this.animateBox(this.mainBox);

        if (!this.findBar) {
            this.findBar = new FindBar();
        }
        this.mainBox.addToolBar("bottom", this.findBar);
        this.mainBox.resize();
    };

    closeFindBar() {
        this.animateBox(this.mainBox);

        this.mainBox.removeToolBar("bottom");
        this.findBar.close();
        this.mainBox.resize();
    }
}

searchManager = new SearchManager();

var menuKb = new HashHandler([
    {
        bindKey: "F6",
        name: "F6",
        exec: function () {
            mainBox[1].toggleShowHide();
        }
    }
]);

event.addCommandKeyListener(window, function (e, hashId, keyCode) {
    var keyString = keyUtil.keyCodeToString(keyCode);
    var command = menuKb.findKeyCommand(hashId, keyString);
    if (command) {
        event.stopEvent(e);
        command.exec();
    }
});

window.onbeforeunload = function () {
    localStorage.tabs = JSON.stringify(tabManager.toJSON());
    localStorage.panels = JSON.stringify(panelManager.toJSON());
};

tabManager = new TabManager({
    main: mainBox[0],
    console: mainBox[1],
});

panelManager = new PanelManager({
    layout: base,
    locations: {
        left: {
            parent: base,
            index: 0,
            size: "200px"
        },
        right: {
            parent: base[1],
            index: 1,
            size: "200px"
        }
    }
});

var tabState = {};
var panelState = {};
try {
    if (localStorage.tabs) {
        tabState = JSON.parse(localStorage.tabs);
    } else {
        let initialTabs = '{"console":{"0":{"type":"pane","tabBar":{"tabList":[],"scrollLeft":0}},"ratio":1,"type":"hbox","fixedSize":100,"size":"100px"},"main":{"0":{"0":{"type":"pane","tabBar":{"tabList":[{"tabTitle":"Untitled 1"},{"tabTitle":"Untitled 2"},{"tabTitle":"Untitled 3"},{"tabTitle":"Untitled 4"},{"tabTitle":"Untitled 5"},{"tabTitle":"Untitled 6"},{"tabTitle":"Untitled 7"},{"tabTitle":"Untitled 8"},{"tabTitle":"Untitled 9"},{"tabTitle":"Untitled 10"},{"tabTitle":"Untitled 11"},{"tabTitle":"Untitled 12"},{"tabTitle":"Untitled 13"},{"tabTitle":"Untitled 14"},{"tabTitle":"Untitled 15","active":true}],"scrollLeft":895.640625}},"1":{"type":"pane","tabBar":{"tabList":[{"tabTitle":"Untitled 16","active":true},{"tabTitle":"Untitled 17"}],"scrollLeft":0}},"ratio":0.5,"type":"hbox","fixedSize":null},"ratio":1,"type":"hbox","fixedSize":null}}';
        tabState = JSON.parse(initialTabs);
    }
    if (localStorage.panels)
        panelState = JSON.parse(localStorage.panels);
} catch (e) {
}
tabManager.setState(tabState);
panelManager.setState(panelState);

onResize();

mainBox[1].addButtons();
