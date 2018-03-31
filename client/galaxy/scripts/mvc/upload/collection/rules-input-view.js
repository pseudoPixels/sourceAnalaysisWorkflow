import _l from "utils/localization";
import Ui from "mvc/ui/ui-misc";
import Select from "mvc/ui/ui-select";
import UploadUtils from "mvc/upload/upload-utils";
import axios from "axios";

export default Backbone.View.extend({
    initialize: function(app) {
        this.app = app;
        this.options = app.options;
        this.ftpUploadSite = app.currentFtp();
        this.setElement(this._template());
        this.btnBuild = new Ui.Button({
            id: "btn-build",
            title: _l("Build"),
            onclick: () => {
                this._eventBuild();
            }
        });
        _.each([this.btnBuild], button => {
            this.$(".upload-buttons").prepend(button.$el);
        });
        const dataTypeOptions = [{ id: "datasets", text: "Datasets" }, { id: "collections", text: "Collection(s)" }];
        this.dataType = "datasets";
        this.dataTypeView = new Select.View({
            css: "upload-footer-selection",
            container: this.$(".rule-data-type"),
            data: dataTypeOptions,
            value: this.dataType,
            onchange: value => {
                this.dataType = value;
                // this._renderSelectedType();
            }
        });

        const selectionTypeOptions = [
            { id: "paste", text: "Pasted Table" },
            { id: "dataset", text: "History Dataset" },
        ];
        if (this.ftpUploadSite) {
            selectionTypeOptions.push({ id: "ftp", text: "FTP Directory" });
        }
        this.selectionType = "paste";
        this.selectionTypeView = new Select.View({
            css: "upload-footer-selection",
            container: this.$(".rule-select-type"),
            data: selectionTypeOptions,
            value: this.selectionType,
            onchange: value => {
                this.selectionType = value;
                this._renderSelectedType();
            }
        });
        this.selectedDatasetId = null;

        this._renderSelectedType();
    },

    _renderSelectedType: function() {
        const selectionType = this.selectionType;
        if (selectionType == "dataset") {
            if (!this.datasetSelectorView) {
                this.selectedDatasetId = null;
                const history = parent.Galaxy && parent.Galaxy.currHistoryPanel && parent.Galaxy.currHistoryPanel.model;
                const historyContentModels = history.contents.models;
                const options = [];
                for (let historyContentModel of historyContentModels) {
                    const attr = historyContentModel.attributes;
                    if (attr.history_content_type !== "dataset") {
                        continue;
                    }
                    options.push({ id: attr.id, text: `${attr.hid}: ${_.escape(attr.name)}` });
                }
                this.datasetSelectorView = new Select.View({
                    container: this.$(".dataset-selector"),
                    data: options,
                    placeholder: _l("Select a dataset"),
                    onchange: val => {
                        this._onDataset(val);
                    }
                });
            } else {
                this.datasetSelectorView.value(null);
            }
        } else if (selectionType == "ftp") {
            UploadUtils.getRemoteFiles(ftp_files => {
                this._setPreview(ftp_files.map(file => file["path"]).join("\n"));
            });
        }
        this._updateScreen();
    },

    _onDataset: function(selectedDatasetId) {
        this.selectedDatasetId = selectedDatasetId;
        if (!selectedDatasetId) {
            this._setPreview("");
            return;
        }
        axios
            .get(
                `${Galaxy.root}api/histories/${Galaxy.currHistoryPanel.model.id}/contents/${selectedDatasetId}/display`
            )
            .then(response => {
                this._setPreview(response.data);
            })
            .catch(error => console.log(error));
    },

    _eventBuild: function() {
        const selection = this.$(".upload-rule-source-content").val();
        this._buildSelection(selection);
    },

    _buildSelection: function(content) {
        const selectionType = this.selectionType;
        const selection = { content: content };
        if (selectionType == "dataset" || selectionType == "paste") {
            selection.selectionType = "raw";
        } else if (selectionType == "ftp") {
            selection.selectionType = "ftp";
        }
        selection.ftpUploadSite = this.ftpUploadSite;
        selection.dataType = this.dataType;
        Galaxy.currHistoryPanel.buildCollection("rules", selection, true);
        this.app.modal.hide();
    },

    _setPreview: function(content) {
        $(".upload-rule-source-content").val(content);
        this._updateScreen();
    },

    _updateScreen: function() {
        const selectionType = this.selectionType;
        const selection = this.$(".upload-rule-source-content").val();
        this.btnBuild[selection || selectionType == "paste" ? "enable" : "disable"]();
        this.$("#upload-rule-dataset-option")[selectionType == "dataset" ? "show" : "hide"]();
        this.$(".upload-rule-source-content").attr("disabled", selectionType !== "paste");
    },

    _template: function() {
        return `
            <div class="upload-view-default">
                <div class="upload-top">
                    <h6 class="upload-top-info">
                        Tabular source data to extract collection files and metadata from
                    </h6>
                </div>
                <div class="upload-box" style="height: 335px;">
                    <span style="width: 25%; display: inline; height: 100%" class="pull-left">
                        <div class="upload-rule-option">
                            <div class="upload-rule-option-title">${_l("Upload data as")}:</div>
                            <div class="rule-data-type" />
                        </div>
                        <div class="upload-rule-option">
                            <div class="upload-rule-option-title">${_l("Load tabular data from")}:</div>
                            <div class="rule-select-type" />
                        </div>
                        <div id="upload-rule-dataset-option" class="upload-rule-option">
                            <div class="upload-rule-option-title">${_l("Select dataset to load")}:</div>
                            <div class="dataset-selector" />
                        </div>
                    </span>
                    <span style="display: inline; float: right; width: 75%; height: 300px">
                    <textarea class="upload-rule-source-content form-control" style="height: 100%"></textarea>
                    </span>
                </div>
                <div class="clear" />
                <!--
                <div class="upload-footer">
                </div>
                -->
                <div class="upload-buttons"/>
                </div>
        `;
    }
});
