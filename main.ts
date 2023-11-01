import { Plugin, MarkdownView, Platform, Editor, App, Modal, Setting } from "obsidian";

const mobileOnlyCorsProxy = 'https://api.codetabs.com/v1/proxy?quest='
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
			callback: () => new FetchPluginModal(this.app,(url) => fetchPluginRelease(url, this.app)).open()
		});
	}

	replaceDoubledEmptyLinesWithSingle(editor: Editor) {
		const doubledEmptyLinesWithOptionalWhiteSpacesRegex = /^\s*?\n\s*?\n/gm;
		return replaceRegex(editor, doubledEmptyLinesWithOptionalWhiteSpacesRegex, '\n');
	}

	removeEmptyLines(editor: Editor) {
		const emptyLinesWithOptionalWhitespacesRegex = /\s*?\n\s*?\n/gm;
		return replaceRegex(editor, emptyLinesWithOptionalWhitespacesRegex, '\n');
	}
}


function replaceRegex(editor: Editor, pattern: RegExp | string, replacement: string) {
	const selectedText = editor.getSelection();
	if (selectedText) {
		const updatedText = selectedText.replace(pattern, replacement)
		editor.replaceSelection(updatedText)
	} else {
		const currentText =  editor.getValue();
		const updatedText = currentText.replace(pattern, replacement)
		editor.setValue(updatedText);
	}
}


async function fetchPluginRelease(ghRepoUrl:string, app: App ){
	try {
		const { origin, pathname }  = new URL(ghRepoUrl);
		const [ , username, pluginName, , , release] = pathname.split('/')
		const fetchAddr = [origin, username, pluginName, 'releases', 'download', release].join("/")

		const toBeFetched = ['main.js', 'manifest.json', 'styles.css']
		const fetchedElements = await Promise.all(toBeFetched.map(async e=> ([e, await (await fetchDataIgnoreCorsIfNeeded(fetchAddr + '/' + e)).text()])));
		const existingElements = fetchedElements.filter(([, content]) => !content.includes("Not Found"))

		const containsRequiredData = existingElements.length >=2;
		if (!containsRequiredData) {
			throw new Error("Error fetching main.js and/or manifest.json")
		}

		const pluginsPath = '.obsidian/plugins/'
		const fullPluginPath = pluginsPath + pluginName
		app.vault.createFolder(fullPluginPath);

		existingElements.map(([filename, content ])=> {
			app.vault.create(fullPluginPath + "/"+ filename, content)
		})
		new InfoModal(this.app, "Successfully installed " + pluginName + " release: " + release +". Please restart Obsidian to make changes visible.").open()	
	}catch (err) {
		new InfoModal(this.app, err.message).open();
	}
}

async function fetchDataIgnoreCorsIfNeeded(url: string) {
	const {isMobile} = Platform;
	return await fetch( isMobile ? mobileOnlyCorsProxy + url : url);
}


export class FetchPluginModal extends Modal {
	result: string;
	onSubmit: (result: string) => void;

	constructor(app: App, onSubmit: (result: string) => void) {
		super(app);
		this.onSubmit = onSubmit;
	}

	onOpen() {
		const { contentEl } = this;
		contentEl.createEl("h1", { text: "Fetch plugin release" });
		new Setting(contentEl)
			.setName("GH Release url")
			.addText((text) =>
				text.onChange((value) => {
					this.result = value
				}));

		new Setting(contentEl)
			.addButton((btn) =>
				btn.setButtonText("Process")
					.setCta()
					.onClick(() => {
						this.close();
						this.onSubmit(this.result);
					}));
	}

	onClose() {
		const { contentEl } = this;
		contentEl.empty();
	}
}

class InfoModal extends Modal {
	message: string;
	constructor(app: App , msg: string) {
		super(app);
		this.message = msg;
	}

	onOpen() {
		const {contentEl} = this;
		contentEl.setText(this.message);
	}

	onClose() {
		const {contentEl} = this;
		contentEl.empty();
	}
}