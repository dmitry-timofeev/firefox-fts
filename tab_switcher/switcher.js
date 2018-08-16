
let selectedString;
let allTabsSorted;

async function reloadTabs(query) {
	if (allTabsSorted === undefined) {
		const allTabs = await browser.tabs.query({windowType: 'normal'});
		allTabsSorted = allTabs.sort((a, b) => b.lastAccessed - a.lastAccessed);
	}

	let tabs = allTabsSorted;
	if (query) {
		tabs = tabs.filter(tabsFilter(query));
	}

	$('#tabs_table tbody').empty().append(
		tabs.map((tab, tabIndex) =>
			$('<tr></tr>').append(
				$('<td></td>').append(
					tab.favIconUrl
						? $('<img width="16" height="16">')
							.attr('src',
								!tab.incognito
									? tab.favIconUrl
									: '/icons/mask16.svg'
							)
						: null
				),
				$('<td></td>').text(tab.title),
				$('<td></td>').text(tab.url),
			)
			.data('index', tabIndex)
			.data('tabId', tab.id)
			.on('click', () => setSelectedString(tabIndex))
			.on('dblclick', e => activateTab())
		)
	);

	setSelectedString(0);
}

function tabsFilter(query) {
	const patterns = query.toLowerCase().split(" ");
	return tab => patterns.every(
		pattern => (tab.url || '').toLowerCase().indexOf(pattern) !== -1
			|| (tab.title || '').toLowerCase().indexOf(pattern) !== -1);
}

reloadTabs();

$('#search_input')
	.focus()
	.on('input', e => reloadTabs(e.target.value));

$(window).on('keydown', event => {
	const key = event.originalEvent.key;

	if (key === 'ArrowDown') {
		setSelectedString(getSelectedStringIndex() + 1);
		event.preventDefault();
	} else if (key === 'ArrowUp') {
		setSelectedString(getSelectedStringIndex() - 1);
		event.preventDefault();
	} else if (key === 'PageDown') {
		setSelectedString(Math.min(getSelectedStringIndex() + 13, getTableSize() - 1));
		event.preventDefault();
	} else if (key === 'PageUp') {
		setSelectedString(Math.max(getSelectedStringIndex() - 13, 0));
		event.preventDefault();
	} else if (key === 'Escape') {
		window.close();
	} else if (key === 'Enter') {
		activateTab();
	} else if (key === 'Delete') {
		closeTab();
		// todo: eventPreventdefault?
	}
});

function setSelectedString(index) {
	const table = $('#tabs_table tbody');

	const selector = String.raw`tr:nth-child(${index+1})`;
	const newSelected = table.find(selector);
	if (!newSelected.length || index < 0) {
		return;
	}

	if (selectedString) {
		selectedString.removeClass('tabs_table__selected');
	}

	newSelected.addClass('tabs_table__selected');

	selectedString = newSelected;

	scrollToSelection();
}

function scrollToSelection() {
	if (!selectedString) {
		return;
	}

	const scrollPadding = 20;

	const tableContainer = $('#tabs_table__container');
	const stringOffset = selectedString[0].offsetTop;
	const scrollMax = stringOffset - scrollPadding;
	const scrollMin = stringOffset
		+ selectedString.height() - tableContainer.height() + scrollPadding;

	if (scrollMax < scrollMin) {
		// Resetting scroll since there is no enough space
		tableContainer.scrollTop(0);
		return;
	}

	const scrollValue = Math.max(0, scrollMin,
		Math.min(scrollMax, tableContainer.scrollTop()));
	tableContainer.scrollTop(scrollValue);
}

function getTableSize() {
	return $('#tabs_table tbody tr').length;
}

function getSelectedStringIndex() {
	return selectedString ? selectedString.data('index') : undefined;
}

async function activateTab() {
	if (!selectedString) {
		return;
	}

	// Switch to the target tab
	const tabId = getSelectedTabId();

	await browser.tabs.update(tabId, {active: true});

	// Focus on the browser window containing the tab
	const tab = await browser.tabs.get(tabId);
	await browser.windows.update(tab.windowId, {focused: true});

	// Close the tab switcher pop up
	window.close();
}

async function closeTab() {
	if (!selectedString) {
		return;
	}
	const tabId = getSelectedTabId();
	
	// Close the selected tab
	await browser.tabs.remove(tabId);

	// Todo: reload the tabs, set selected properly
}

function getSelectedTabId() {
	return selectedString.data('tabId');
}
