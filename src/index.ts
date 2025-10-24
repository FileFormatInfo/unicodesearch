import "./styles.css";
import "../node_modules/tabulator-tables/dist/css/tabulator_bootstrap5.min.css";

import {
	CellComponent,
	EditModule,
	Filter,
	FilterModule,
	FormatModule,
	InteractionModule,
	PopupModule,
	ResizeColumnsModule,
	ResizeTableModule,
	ResponsiveLayoutModule,
	Sorter,
	SortModule,
	Tabulator,
	TooltipModule,
} from "tabulator-tables";

type SearchEntry = {
	code: string;
	example: string;
	name: string;
	age: string;
	block: string;
	category: string;
	tags?: string[];
};

type SearchData = {
	success: boolean;
	data: SearchEntry[];
};

const dataUrl = "/ucd.json";

const categoryMap: { [key: string]: string } = {
	"Cc": "Other, Control",
	"Cf": "Other, Format",
	"Cn": "Other, Not Assigned (no characters in the file have this property)",
	"Co": "Other, Private Use",
	"Cs": "Other, Surrogate",
	"LC": "Letter, Cased",
	"Ll": "Letter, Lowercase",
	"Lm": "Letter, Modifier",
	"Lo": "Letter, Other",
	"Lt": "Letter, Titlecase",
	"Lu": "Letter, Uppercase",
	"Mc": "Mark, Spacing Combining",
	"Me": "Mark, Enclosing",
	"Mn": "Mark, Nonspacing",
	"Nd": "Number, Decimal Digit",
	"Nl": "Number, Letter",
	"No": "Number, Other",
	"Pc": "Punctuation, Connector",
	"Pd": "Punctuation, Dash",
	"Pe": "Punctuation, Close",
	"Pf": "Punctuation, Final quote (may behave like Ps or Pe depending on usage)",
	"Pi": "Punctuation, Initial quote (may behave like Ps or Pe depending on usage)",
	"Po": "Punctuation, Other",
	"Ps": "Punctuation, Open",
	"Sc": "Symbol, Currency",
	"Sk": "Symbol, Modifier",
	"Sm": "Symbol, Math",
	"So": "Symbol, Other",
	"Zl": "Separator, Line",
	"Zp": "Separator, Paragraph",
	"Zs": "Separator, Space"
}

// translates from a hex codepoint string to the actual character
function codeToString(code: string):string {
	return String.fromCodePoint(parseInt(code, 16));
}

function filterCategory(
	headerValue: string,
	rowValue: string,
	rowData: any,
	filterParams: any
) {
	if (!headerValue) return true;

	const headerUpper = headerValue.toUpperCase();
	if (headerValue.length == 2) {
		return rowValue.toUpperCase() == headerUpper;
	}

	const description = categoryMap[rowValue].toUpperCase();

	return description.startsWith(headerUpper);
}

function filterName(
	headerValue: string,
	sortValue: string,
	rowData: any,
	filterParams: any
) {
	if (!headerValue) return true;

	const rowValue = rowData.name;

	if (headerValue.length == 1 && headerValue != "^" && headerValue != "/") {
		// single character, do starts with
		const search = headerValue.toLowerCase();
		return rowValue.toLowerCase().startsWith(search);
	}

	if (headerValue.startsWith("^")) {
		// starts with
		if (headerValue.length == 1) {
			return true;
		}
		const search = headerValue.substring(1).toLowerCase();
		return rowValue.toLowerCase().startsWith(search);
	}

	if (headerValue.startsWith("/") && headerValue.endsWith("/")) {
		// regex
		const pattern = headerValue.substring(1, headerValue.length - 1);
		try {
			const re = new RegExp(pattern, "i");
			return re.test(rowValue);
		} catch (e) {
			// bad regex
			return false;
		}
	}

	// contains
	const search = headerValue.toLowerCase();
	return rowValue.toLowerCase().includes(search);
}

function filterTags(
	headerValue: string,
	rowValue: string[],
	rowData: any,
	filterParams: any
) {
	if (!headerValue || headerValue.length == 0) return true;

	const headerVals = headerValue.split(/[ ,]+/);
	const rowVals:string[] = rowValue || [];

	for (const filterVal of headerVals) {
		if (filterVal.startsWith("!")) {
			if (rowVals.indexOf(filterVal.slice(1)) != -1) {
				return false;
			}
		} else {
			if (rowVals.indexOf(filterVal) == -1) {
				return false;
			}
		}
	}
	return true;
}

function fmtCategory(cell: CellComponent) {
	const val = cell.getValue() as string;
	if (!val) {
		return "(missing)";
	}
	return categoryMap[val] || val;
}

function fmtCodepoint(cell: CellComponent) {
	const val = cell.getValue() as string;
	if (!val) {
		return "";
	}
	return `U+${val.toUpperCase()}`;
}
function fmtExample(cell: CellComponent) {
	const val = cell.getValue() as string;
	if (!val) {
		return "";
	}
	return `<span style="font-size:2em;">${val}</span>`;
}

function fmtTags(cell: CellComponent) {
	const tags = cell.getValue() as string[];
	if (!tags || tags.length === 0) {
		return "";
	}

	const container = document.createElement("div");

	const keys = tags.sort();

	for (const key of keys) {
		var el = document.createElement("span");
		el.className =
			"badge border border-primary text-primary me-1 mb-1 text-decoration-none";
		el.textContent = key;
		el.style.cursor = "pointer";
		el.onclick = (e) => {
			e.preventDefault();
			e.stopPropagation();
			toggleTagFilter(cell, key);
		}
		container.appendChild(el);
	}

	return container;
}

function imgTooltipFn(imgType: string) {
	return function (e: MouseEvent, cell: CellComponent, onRendered: any) {
		var value = cell.getValue();
		if (!value) {
			return "n/a";
		}

		const handle = cell.getRow().getData().logohandle;

		const el = document.createElement("img");
		el.src = `https://www.vectorlogo.zone/logos/${handle}/${handle}-${imgType}.svg`;
		el.style.height = "256px";

		return el;
	};
}

function imgClickFn(imgType: string, extraParams: string) {
	return function (e: UIEvent, cell: CellComponent) {
		var value = cell.getValue();
		if (!value) {
			return;
		}

		const handle = cell.getRow().getCell("logohandle").getValue();

		const url = `https://svg-viewer.fileformat.info/view.html?url=https://www.vectorlogo.zone/logos/${handle}/${handle}-${imgType}.svg&backUrl=https://www.vectorlogo.zone/logos/${handle}/${extraParams}`;
		window.open(url, "_blank")?.focus();
	};
}

function showError(msg: string) {
	console.log(`ERROR: ${msg}`);
	document.getElementById("loading")!.classList.add("d-none");
	document.getElementById("errdiv")!.classList.remove("d-none");
	document.getElementById("errmsg")!.innerHTML = msg;
}


const tickElement = `<svg enable-background="new 0 0 24 24" height="14" width="14" viewBox="0 0 24 24" xml:space="preserve"><path fill="#2DC214" clip-rule="evenodd" d="M21.652,3.211c-0.293-0.295-0.77-0.295-1.061,0L9.41,14.34  c-0.293,0.297-0.771,0.297-1.062,0L3.449,9.351C3.304,9.203,3.114,9.13,2.923,9.129C2.73,9.128,2.534,9.201,2.387,9.351  l-2.165,1.946C0.078,11.445,0,11.63,0,11.823c0,0.194,0.078,0.397,0.223,0.544l4.94,5.184c0.292,0.296,0.771,0.776,1.062,1.07  l2.124,2.141c0.292,0.293,0.769,0.293,1.062,0l14.366-14.34c0.293-0.294,0.293-0.777,0-1.071L21.652,3.211z" fill-rule="evenodd"></path></svg>`;

function tickLinkFormatter(cell: CellComponent) {
	const value = cell.getValue() as string;
	if (!value) {
		return "";
	}
	var el = document.createElement("a");
	el.href = value;
	el.target = "_blank";
	el.innerHTML = tickElement;
	return el;
}

function tickLinkFilter(
	headerValue: boolean,
	rowValue: string,
	rowData: any,
	filterParams: any
) {
	if (headerValue === true) {
		return rowValue && rowValue.length > 0;
	} else if (headerValue === false) {
		return !rowValue || rowValue.length === 0;
	}
	return true; // null case
}

function toggleColumns(tbl: Tabulator, columns: string[]): void {
	for (const col of columns) {
		const column = tbl.getColumn(col);
		if (column) {
			if (column.isVisible()) {
				column.hide();
			} else {
				column.show();
			}
		}
	}
}

function toggleTagFilter(cell: CellComponent, tag: string): void {
	const tbl = cell.getTable();
	var headerFilter = "";
	const headerFilters = tbl.getHeaderFilters();
	var existingFilter: Filter | null = null;
	for (const hf of headerFilters) {
		if (hf.field == "tags") {
			headerFilter = hf.value;
			existingFilter = hf;
			break;
		}
	}

	if (existingFilter == null) {
		console.log(`adding to blank`);
		tbl.setHeaderFilterValue(cell.getColumn(), tag);
	} else {
		tbl.setHeaderFilterValue(
			cell.getColumn(),
			(existingFilter.value = toggleTagArray(
				headerFilter.split(/[ ,]+/),
				tag
			).join(" "))
		);
	}
	tbl.refreshFilter();
}

function toggleTagArray(tags: string[], tag: string): string[] {
	var idx = tags.indexOf(tag);
	if (idx != -1) {
		tags.splice(idx);
		tags.push(`!${tag}`);
		return tags;
	}

	idx = tags.indexOf(`!${tag}`);
	if (idx != -1) {
		tags.splice(idx);
		return tags;
	}

	tags.push(tag);
	return tags;
}

async function main() {
	let data: SearchEntry[];

	var rawData:any;
	try {
		const resp = await fetch(dataUrl, {
			method: "GET",
			redirect: "follow",
		});
		if (!resp.ok) {
			showError(
				`HTTP Error fetching logo data: ${resp.status} ${resp.statusText}`
			);
			return;
		}
		rawData = (await resp.json() as SearchData);
	} catch (error) {
		showError(`Error fetching Unicode character data: ${error}`);
		return;
	}

	data = rawData.data;

	for (const row of data) {
		row.example = codeToString(row.code);
	}

	console.log(data[0]);

	const qs = new URLSearchParams(window.location.search);
	const sort: Sorter[] = [ { column: "code", dir: "asc" } ];
	const filters: Filter[] = [];
	if (qs) {
		;
		for (const [key, value] of qs.entries()) {
			if (key == "sort") {
				sort[0].column = value;
				continue;
			}
			if (key == "dir") {
				sort[0].dir = (value == "desc") ? "desc" : "asc";
			}
			if (key && value) {
				filters.push({ field: key, type: "=", value: value });
			}
		}
	}

	Tabulator.registerModule([
		EditModule,
		FilterModule,
		FormatModule,
		InteractionModule,
		PopupModule,
		ResizeColumnsModule,
		ResizeTableModule,
		ResponsiveLayoutModule,
		SortModule,
		TooltipModule,
	]);

	const table = new Tabulator("#achtable", {
		autoResize: true,
		data,
		columns: [
			{
				cellClick: (e, cell) => {
					const data = cell.getRow().getData();
					e.preventDefault();
					e.stopPropagation();
					table.alert(
						`${data.name} (U+${data.code}) copied to clipboard`
					);
					setTimeout(() => table.clearAlert(), 1000);
					navigator.clipboard.writeText(data.example);
				},
				field: "",
				formatter: () =>
					`<img src="/images/icons/clipboard.svg" alt="Copy to clipboard" height="16">`,
				headerSort: false,
				title: "",
			},
			{
				cssClass: "p-0 flex justify-content-center align-items-center",
				field: "example",
				formatter: fmtExample,
				headerFilter: "input",
				headerFilterFunc: (
					headerValue,
					rowValue,
					rowData,
					filterParams
				) => {
					if (!headerValue) return true;
					return headerValue == rowValue;
				},
				headerHozAlign: "center",
				headerSort: false,
				hozAlign: "center",
				responsive: 0,
				title: "Example",
				width: 150,
			},
			{
				field: "code",
				formatter: fmtCodepoint,
				headerFilter: "input",
				headerHozAlign: "center",
				hozAlign: "center",
				responsive: 10,
				sorter: function (a, b, aRow, bRow, column, dir, sorterParams) {
					const aInt = parseInt(a, 16);
					const bInt = parseInt(b, 16);
					return aInt - bInt;
				},
				title: "Codepoint",
				width: 150,
			},
			{
				field: "block",
				headerFilter: "input",
				headerHozAlign: "center",
				hozAlign: "center",
				responsive: 20,
				title: "Block",
				visible: false,
				width: 175,
			},
			{
				field: "category",
				formatter: fmtCategory,
				headerFilter: "input",
				headerFilterFunc: filterCategory,
				headerHozAlign: "center",
				hozAlign: "center",
				responsive: 40,
				title: "Category",
				visible: false,
				width: 200,
			},
			{
				field: "script",
				headerFilter: "input",
				headerFilterFunc: "starts",
				headerHozAlign: "center",
				hozAlign: "center",
				responsive: 50,
				title: "Script",
				visible: false,
				width: 100,
			},
			{
				field: "age",
				headerFilter: "input",
				headerFilterFunc: "starts",
				headerHozAlign: "center",
				hozAlign: "center",
				responsive: 30,
				title: "Version",
				visible: false,
				width: 110,
			},
			{
				title: "Name",
				field: "name",
				formatter: "link",
				formatterParams: {
					labelField: "name",
					url: (cell) => {
						var codepoint = cell.getData().code;
						return `https://www.fileformat.info/info/unicode/char/${codepoint}/index.htm`;
					},
					target: "_blank",
				},
				headerFilter: "input",
				headerFilterFunc: filterName,
				headerPopup: `Use <code>^</code> to search at the beginning<br/>Use <code>/regex/</code> to search with a regular expression`,
				headerPopupIcon:
					'<span class="badge rounded-pill text-bg-primary">?</span>',
				responsive: 0,
				//sorter: "string",
				width: 375,
			},
			{
				title: "Tags",
				field: "tags",
				formatter: fmtTags,
				headerFilter: "input",
				headerFilterFunc: filterTags,
				headerPopup: `Separate multiple tags with space or comma.<br/>Pr	efix a tag with <code>!</code> to exclude it.`,
				headerPopupIcon:
					'<span class="badge rounded-pill text-bg-primary">?</span>',
				headerSort: false,
				responsive: 15,
				width: 375,
			},
		],
		height: "100%",
		initialHeaderFilter: filters,
		initialSort: [{ column: "code", dir: "asc" }],
		layout: "fitDataStretch",
		placeholder: "No matches",
		responsiveLayout: "hide",
		footerElement: `<span class="w-100 mx-2 my-1">
				<img src="/favicon.svg" class="pe-2" style="height:1.2em;" alt="UnicodeSearch logo"/>UnicodeSearch
				<span id="rowcount" class="px-3">Rows: ${data.length.toLocaleString()}</span>
				<input id="showhidecolumns" type="checkbox" class="mx-2" title="Toggle columns: Version, Block, Category, Script"/> Show/Hide Detail Columns
				<a class="d-none d-lg-block float-end" href="https://github.com/FileFormatInfo/unicodesearch">Source</a>
			</span>`,
	});

	table.on("dataFiltered", function (filters, rows) {
		var el = document.getElementById("rowcount");
		if (filters && filters.length > 0) {
			el!.innerHTML = `Rows: ${rows.length.toLocaleString()} of ${data.length.toLocaleString()}`;
			var qs = filters
				.map(f => `${encodeURIComponent(f.field)}=${encodeURIComponent(f.value)}`)
				.join("&");
			qs += `&sort=${table.getSorters()[0]?.column.getField()}&dir=${table.getSorters()[0]?.dir}`;
			window.history.replaceState(null, "", "?" + qs);
		} else {
			el!.innerHTML = `Rows: ${data.length.toLocaleString()}`;
		}
	});

	table.on("dataSorted", function (sorters, rows) {
		var qs = `sort=${sorters[0]?.column.getField()}&dir=${sorters[0]?.dir}`;
		const filters = table.getFilters(true);
		if (filters && filters.length > 0) {
			qs = filters
				.map(f => `${encodeURIComponent(f.field)}=${encodeURIComponent(f.value)}`)
				.join("&") + "&" + qs;
		}
		window.history.replaceState(null, "", "?" + qs);
	});

	table.on("tableBuilt", function () {
		document.getElementById("showhidecolumns")!.onclick = () =>
			toggleColumns(table, ["age", "block", "category", "script"]);
	});

	document.getElementById("loading")!.style.display = "none";
	document.getElementById("achtable")!.style.display = "block";
}

main();
