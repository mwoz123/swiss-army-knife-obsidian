import { Plugin, MarkdownView, Editor, App } from "obsidian";

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
			name: "Fetch different plugin version",
			editorCallback: () => this.fetchPluginPreviousRelease(this.app),
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

	async fetchPluginPreviousRelease(app: App) {
		const ghUrl = 'https://github.com/mwoz123/archive-to-single-note';
		return fetchPluginPrevRelease(ghUrl, app );
	}


}

function replaceRegexInFile(editor: Editor, pattern: RegExp | string, replacement: string) {
	const currentText = editor.getValue();
	const updatedText = currentText.replace(pattern, replacement)
	editor.setValue(updatedText);
}


async function fetchPluginPrevRelease(ghRepoUrl:string, app: App, version = 'latest', ){
	
	const urlForGivenVersion = ghRepoUrl + "/releases/" + version;
	const { ok, url } = await fetch(urlForGivenVersion);
	if (!ok) return ;

	const isValidRedirectUrl = url.includes('/releases/tag')
	if(!isValidRedirectUrl) return ;

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
	console.log("done");
}
