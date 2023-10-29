import { Plugin, MarkdownView, Editor, App, Modal, Setting } from "obsidian";

export default class SwissArmyKnifePlugin extends Plugin {
	async onload() {
		this.addCommand({
			id: "replace-doubled-empty-lines-with-single",
			name: "Replace doubled empty lines with single",
			editorCallback: (editor: Editor, view: MarkdownView) => this.replaceDoubledEmptyLinesWithSingle(editor),
		});
		this.addCommand({
			id: "remove-empty-lines",
			name: "Remove empty lines",
			editorCallback: (editor: Editor, view: MarkdownView) => this.removeEmptyLines(editor),
		});
		this.addCommand({
			id: "fetch-plugin-version",
			name: "Fetch plugin version",
			callback: () => new PluginModal(this.app,(url, version) => fetchPluginVersion(url, this.app, version)).open()
		});
	}

	replaceDoubledEmptyLinesWithSingle(editor: Editor) {
		const doubledEmptyLinesWithOptionalWhiteSpacesRegex = /^\s*?\n\s*?\n/gm;
		return replaceRegexInFile(editor, doubledEmptyLinesWithOptionalWhiteSpacesRegex, '\n');
	}

	removeEmptyLines(editor: Editor) {
		const emptyLinesWithOptionalWhitespacesRegex = /\s*?\n\s*?\n/gm;
		return replaceRegexInFile(editor, emptyLinesWithOptionalWhitespacesRegex, '\n');
	}
}


function replaceRegexInFile(editor: Editor, pattern: RegExp | string, replacement: string) {
	const currentText = editor.getValue();
	const updatedText = currentText.replace(pattern, replacement)
	editor.setValue(updatedText);
}


async function fetchPluginVersion(ghRepoUrl:string, app: App, version = 'latest', ){
	const urlForGivenVersion = ghRepoUrl + "/releases/" + version;
	const { ok, url } = await fetch(urlForGivenVersion);
	if (!ok) 
		throw new Error("Invalid url: "+ urlForGivenVersion) ;

	const isValidRedirectUrl = url.includes('/releases/tag')
	if(!isValidRedirectUrl) 
		throw new Error("Redirect url is not valid " + url);

	const fetchUrl = url.replace('/releases/tag/', '/releases/download/');

	const toBeFetched = ['main.js', 'manifest.json', 'styles.css']
	const fetchedElements = await Promise.all(toBeFetched.map(async e=> ([e, await (await fetch(fetchUrl + '/' + e)).text()])));
	const existingElements = fetchedElements.filter(([file, content]) => !content.includes("Not Found"))

	const urlParts = url.split("/")
	const pluginName = urlParts[4];
	const pluginsPath = '.obsidian/plugins/'
	const fullPluginPath = pluginsPath + pluginName
	app.vault.createFolder(fullPluginPath);

	existingElements.map(([filename, content ])=> {
		app.vault.create(fullPluginPath + "/"+ filename, content)
	})
}


export class PluginModal extends Modal {
	result: string;
	version: string;
	onSubmit: (result: string, version: string) => void;

	constructor(app: App, onSubmit: (result: string, version: string) => void) {
		super(app);
		this.onSubmit = onSubmit;
	}

	onOpen() {
		const { contentEl } = this;
		contentEl.createEl("h1", { text: "GH repo url" });
		new Setting(contentEl)
			.setName("url")
			.addText((text) =>
				text.onChange((value) => {
					this.result = value
				}));
		new Setting(contentEl)
			.setName("version")
			.addText((text) => {
				text.setValue('latest')
				text.onChange((ver) => {
					this.version = ver
				})});
		new Setting(contentEl)
			.addButton((btn) =>
				btn.setButtonText("Process")
					.setCta()
					.onClick(() => {
						this.close();
						this.onSubmit(this.result, this.version);
					}));
	}

	onClose() {
		const { contentEl } = this;
		contentEl.empty();
	}
}