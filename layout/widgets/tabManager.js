var dom = require("ace/lib/dom");
var lib = require("layout/lib");
var oop = require("ace/lib/oop");
var {EventEmitter} = require("ace/lib/event_emitter");
var ace = require("ace/ace");

var Editor = require("ace/editor").Editor;
var EditSession = require("ace/edit_session").EditSession;
var Renderer = require("ace/virtual_renderer").VirtualRenderer;
var theme = require("ace/theme/textmate");

var {Box, Pane} = require("layout/widgets/box");
var newTabCounter = 1;



function parseJson(name) {
    try {
        return JSON.parse(localStorage[name]);
    } catch(e) {
        return null;
    }
}

function saveJson(name, value) {
    localStorage[name] = JSON.stringify(value);
}

class TabManager {
    /**
     *
     * @param {Object} options
     * @param {Box} options.console
     * @param {Box} options.main
     */
    constructor(options) {
        this.containers = {};
        this.containers.console = options.console;
        this.containers.main = options.main;
        this.tabs = {};
    }

    toJSON() {
        var containers = this.containers
        return {
            console: containers.console && containers.console.toJSON(),
            main: containers.main && containers.main.toJSON(),
        };
    }

    /**
     *
     * @param {Box} box
     * @param {Object} boxData
     * @param {Number} index
     */
    setChildBoxData(box, boxData, index) {
        if (!boxData[index])
            return;

        var boxType = boxData[index].type;
        if (!box[index])
            box.addChildBox(index, boxType === "pane" ? new Pane({tabList: {}}) : new Box({vertical: boxType === "vbox"}))

        this.setBoxData(box[index], boxData[index]);

    }

    /**
     *
     * @param {Box} box
     * @param {Object} boxData
     */
    setBoxData(box, boxData) {
        if (!boxData) return;

        var boxType = boxData.type;
        if (boxData.fixedSize)
            box.fixedSize = boxData.fixedSize;

        if (boxType === "pane") {
            if (boxData.tabBar) {
                box.tabBar.scrollLeft = boxData.tabBar.scrollLeft;
                if (boxData.tabBar.tabList) {
                    box.tabBar.freeze = true;
                    boxData.tabBar.tabList.forEach((tab) => {
                        tab = box.tabBar.addTab(tab)
                        this.tabs[tab.path] = tab;
                        if (tab.preview)
                            this.previewTab = tab;
                    })
                    box.tabBar.freeze = false;
                    box.tabBar.configurate();
                }
            }
        } else {
            box.hidden = boxData.hidden;
            box.ratio = boxData.ratio;
            this.setChildBoxData(box, boxData, 0);
            this.setChildBoxData(box, boxData, 1);
        }
    }

    setState(state) {
        var setState = (box, state) => {
            if (!box) return
            box.removeAllChildren();
            this.setBoxData(box, state);
            if (!box[0] && box.isMain)
                this.setChildBoxData(box, [{type: "pane"}], 0)

        };

        setState(this.containers.main, state && state.main);
        setState(this.containers.console, state && state.console);
    }

    clear() {

    }

    getPanes() {

    }

    getTabs() {

    }

    get activePane() {
        return this.containers.main.element.querySelector(".tabPanel").host
    }

    get activeTab() {
        return this.activePane.tabBar.activeTab;
    }

    /**
     *
     * @param {Tab} tab
     */
    activateTab(tab) {
        var pane = tab.parent.parent;

        function initBoxTabEditor() {
            tab.editorType = tab.editorType || "ace";
            if (!pane.editors) pane.editors = {};
            var editorType = tab.editorType;

            if (!pane.editors[editorType]) {
                pane.editor = new Editor(new Renderer(null, theme));
                pane.editor.container.style.position = "absolute";
                pane.editors[editorType] = pane.editor;
                pane.editor.setSession(null)
            } else {
                pane.editor = pane.editors[editorType];
        }
            pane.editor.container.style.display = "";

            pane.element.appendChild(pane.editor.container);
        }
        initBoxTabEditor();
        tabManager.loadFile(tab);

        pane.resize();
    }

    /**
     *
     * @param {Tab} tab
     */
    deactivateTab(tab) {
        var pane = tab.parent.parent;
        if (tab.parent.activeTab == tab && pane.editor) {
            pane.editor.container.style.display = "none";
        }
    }

    open(options) {
        var tab = this.tabs[options.path]
        if (!tab || !tab.parent) {
            var pane = this.activePane
            if (this.previewTab)
                this.previewTab.remove();

            var tabTitle = options.path.split("/").pop();

            tab = pane.tabBar.addTab({
                preview: options.preview,
                tabTitle: tabTitle,
                path: options.path,
                active: true,
            });
            if (options.preview)
                this.previewTab = tab;
            tab.parent.scrollTabIntoView(tab)
            this.tabs[tab.path] = tab
        }
        if (!options.preview) {
            if (this.previewTab == tab) {
                this.clearPreviewStatus(tab);
            } else if (this.previewTab) {
                this.previewTab.remove();
            }
        }
        tab.parent.removeSelections()
        tab.parent.activateTab(tab);
        return tab;
    }

    clearPreviewStatus(tab) {
        tab.preview = false;
        tab.element.style.fontStyle = ""
        if (this.previewTab == tab)
            this.previewTab = null;

    }

    /**
     *
     * @param {Tab} tab
     */
    saveMetadata(tab) {
        if (!tab.path || !tab.session) return;

        var session = tab.session
        var undoManager = tab.session.$undoManager;
        localStorage["@file@" + tab.path] = JSON.stringify({
            selection: session.selection.toJSON(),
            undoManager: undoManager.toJSON(),
            value: undoManager.isClean() ? undefined : session.getValue(),
            scroll: [
                session.getScrollLeft(),
                session.getScrollTop()
            ],
        });
    }

    /*updateSaveButton(e, editor) {
        var tab = editor.session.tab;
        if (tab.parent && tab.parent.activeTab == tab) {
            if (tab.session.getUndoManager().isClean() != this.refs.saveButton.disabled) {
                this.refs.saveButton.disabled = tab.session.getUndoManager().isClean();
            }
            if (this.refs.saveButton.disabled) {
                tab.element.classList.remove("changed");
            } else {
                tab.element.classList.add("changed");
            }
        }
        if (e && tab.preview) {
            tabManager.clearPreviewStatus(tab);
        }
    }*/

    /**
     *
     * @param {Tab} tab
     * @param {String|undefined} value
     */
    setSession(tab, value) {
        var editor = tab.editor
        if (!editor) return;

        if (editor.session && editor.session.tab) {
            this.saveMetadata(editor.session.tab);
        }

        if (typeof value == "string") {
            tab.session = ace.createEditSession(value || "");
            tab.session.tab = tab;
            // tab.editor.on("input", updateSaveButton)
            this.loadMetadata(tab)
        }

        editor.setSession(tab.session);

        editor.container.style.display = "";

        editor.setOptions({
            newLineMode: "unix",
            enableLiveAutocompletion: true,
            enableBasicAutocompletion: true,
            showPrintMargin: false,
        });
    }

    /**
     *
     * @param {Tab} tab
     */
    loadMetadata(tab) {
        var path = tab.path;
        var session = tab.session;
        var metadata = parseJson("@file@" + path)
        if (!metadata) return;
        try {
            if (typeof metadata.value == "string" && metadata.value != session.getValue()) {
                session.doc.setValue(metadata.value);
            }
            if (metadata.selection) {
                session.selection.fromJSON(metadata.selection);
            }
            if (metadata.scroll) {
                session.setScrollLeft(metadata.scroll[0]);
                session.setScrollTop(metadata.scroll[1]);
            }

        } catch(e) {
            console.error(e)
        }
    }

    /**
     *
     * @param {Pane} pane
     */
    addNewTab(pane) {
        pane.tabBar.addTab({
            tabTitle: `Untitled ${newTabCounter++}`,
            active: true,
        });
    };

    /**
     * TODO: needs to actually load files
     * @param {Tab} tab
     */
    loadFile(tab) {
        if (!tab.editor) return;

        if (tab.session) {
            this.setSession(tab, tab.session)
        } else if (!tab.path) {
            this.setSession(tab, "")
        } else if (tab.path) {
            tab.editor.container.style.display = "none";
        } else {
            tab.editor.container.style.display = "none";
        }
    };
}

oop.implement(TabManager.prototype, EventEmitter);

exports.TabManager = TabManager