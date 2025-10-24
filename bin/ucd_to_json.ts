#!/usr/bin/env node

import fs from 'fs/promises';
import path from 'path';
import { XMLParser } from 'fast-xml-parser';
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

type SearchEntry = {
	code: string;
	name: string;
	age: string;
	block: string;
	category: string;
	script: string;
	tags?: string[];
}

type SearchData = {
	success: boolean;
	data: SearchEntry[];
}

async function main() {
	console.log(`INFO: starting at ${new Date().toISOString()}`);

	const xmlPath = path.join( __dirname, '..', 'tmp', 'ucd.all.flat.xml' );
	const jsonPath = path.join( __dirname, '..', 'public', 'ucd.json' );

	try {
		await fs.access(xmlPath);
	} catch (err) {
		console.log(`INFO: XML file does not exist in ${xmlPath}`);
		process.exit(1);
	}

	// Read and parse the XML file
	console.log(`INFO: reading XML file from ${xmlPath}`);
	const xmlData = await fs.readFile(xmlPath, 'utf-8');
	console.log(`INFO: parsing XML data`);
	const parser = new XMLParser({
		ignoreAttributes: false,
		attributeNamePrefix: '',
	});
	const jsonObj = parser.parse(xmlData);

	console.log(`INFO: parsed ${jsonObj.ucd.repertoire.char.length} characters`);

	if (true) {
		fs.writeFile(
			path.join(__dirname, "..", "tmp", "ucd.all.flat.json"),
			JSON.stringify(jsonObj, null, 2),
			"utf-8"
		);
	}

	console.log(`INFO: generating JSON data`);
	const entries: SearchEntry[] = [];

	for (const charData of jsonObj.ucd.repertoire.char) {

		if (!charData.cp || charData.cp.length === 0) {
			if (!charData['first-cp']) {	// some private use area ranges mixed in
				console.log(`WARN: skipping entry with no code point (${JSON.stringify(charData)})`);
			}
			continue;
		}

		const tags: string[] = [];
		if (charData.WSpace === 'Y') {
			tags.push('Whitespace');
		}
		if (charData.Emoji === 'Y') {
			tags.push('Emoji');
		}
		if (charData.Dep === 'Y') {
			tags.push('Deprecated');
		}
		if (charData.QMark === 'Y') {
			tags.push('Quote');
		}
		if (charData.Dash === 'Y') {
			tags.push('Dash');
		}

		switch (charData.nt) {
			case 'De':
				tags.push('Decimal');
				break;
			case 'Di':
				tags.push('Digit');
				break;
			case 'Nu':
				tags.push('Numeric');
				break;
		}

		if (charData.Upper === 'Y') {
			tags.push('Uppercase');
		}
		if (charData.Lower === 'Y') {
			tags.push('Lowercase');
		}
		if (charData.OUpper === "Y") {
			tags.push("Other_Uppercase");
		}
		if (charData.Lower === "Y") {
			tags.push("Other_Lowercase");
		}

		if (charData.Term === 'Y') {
			tags.push('Terminal_Punctuation');
		}
		if (charData.STerm === 'Y') {
			tags.push('Sentence_Terminal');
		}
		if (charData.Dia === 'Y') {
			tags.push('Diacritic');
		}
		if (charData.Ext === 'Y') {
			tags.push('Extender');
		}
		if (charData.SD === 'Y') {
			tags.push('Soft_Dotted');
		}
		if (charData.Alpha === 'Y') {
			tags.push('Alphabetic');
		}
		if (charData.OAlpha === 'Y') {
			tags.push('Other_Alphabetic');
		}
		if (charData.Math === 'Y') {
			tags.push('Math');
		}
		if (charData.OMath === 'Y') {
			tags.push('Other_Math');
		}
		if (charData.Hex === 'Y') {
			tags.push('Hexadecimal');
		}
		if (charData.AHex === 'Y') {
			tags.push('ASCII_Hexadecimal');
		}
		if (charData.RI === 'Y') {
			tags.push('Regional_Indicator');
		}
		if (charData.NChar === 'Y') {
			tags.push('Noncharacter_Code_Point');
		}
		if (charData.VS === 'Y') {
			tags.push('Variation_Selector');
		}

		var name = charData.na || charData.na1;
		if (!name && charData['name-alias']) {
			name = charData['name-alias'][0].alias;
		}

		entries.push({
			code: charData.cp,
			name: name || "(no name)",
			age: charData.age,
			block: charData.blk.replaceAll('_', ' '),
			category: charData.gc,
			script: charData.sc,
			tags: tags.length ? tags : undefined,
		});
	}

	const output: SearchData = {
		success: true,
		data: entries,
	};

	// Write the JSON data to a file
	console.log(`INFO: writing JSON data to ${jsonPath}`);
	await fs.writeFile(jsonPath, JSON.stringify(output, null, 2), 'utf-8');
	console.log(`INFO: wrote JSON data to ${jsonPath}`);
}



main().then( () => {
	console.log(`INFO: complete at ${new Date().toISOString()}`);
});
