## Full list of Events by Categories

(see below for full list of events)

All the events are published with a data payload in a `CustomEvent`, so you will typically find the payload under the `detail` property of the `CustomEvent`. However please note that the events from `SlickGrid` and `SlickDataView`, shown at the bottom of the list, are published with a different structure which is also including the JS event that it was triggered with under the property `eventData` and the payload itself is under the `args` property (which follows original SlickGrid structure). To subscribe to all events, you can use your PubSub instance (if available) or add listeners on your grid container DOM element.

#### `SlickGrid` and `SlickDataView`
```tsx
// 1. with PubSub instance
this.reactGrid.instances?.eventPubSubService?.subscribe('onCellChange', (payload) => console.log('PubSub, cell changed data:', payload));

// 2. with CustomEvent in the View (see html code below)
handleOnCellChange(e, args) {
  // `eventData` is the event it was triggered from and `args` is the data payload
  const { eventData, args } = e.detail;
  const dataContext = args?.item;
  console.log('cell changed data:', args);
}

render() {
  <SlickgridReact
      gridId='grid3'
      columnDefinitions={this.state.columnDefinitions}
      gridOptions={this.state.gridOptions}
      dataset={this.state.dataset}
      onReactGridCreated={e => { this.reactGridReady(e.detail); }}
      onCellChange={e => { this.handleOnCellChange(e.detail.eventData, e.detail.args); }}
    />
}
```

#### all other events
```ts
// 1. with PubSub instance
this.reactGrid.instances?.eventPubSubService?.subscribe('onHeaderMenuCommand', (payload) => console.log('PubSub, header menu command', payload));

// 2. with CustomEvent in the View (see html code below)
handleOnHeaderMenuCommand(e) {
  // detail is the args data payload
  const args = e.detail;
  console.log('header menu command', args);
}

render() {
  <SlickgridReact
      gridId='grid3'
      columnDefinitions={this.state.columnDefinitions}
      gridOptions={this.state.gridOptions}
      dataset={this.state.dataset}
      onReactGridCreated={e => { this.reactGridReady(e.detail); }}
      onHeaderMenuCommand={e => { this.handleOnHeaderMenuCommand(e.detail); }}
    />
}
```

---

#### SlickContextMenu (extension)
  - `onContextMenuClearGrouping`
  - `onContextMenuCollapseAllGroups`
  - `onContextMenuExpandAllGroups`

#### SlickGridMenu (extension)
  - `onGridMenuMenuClose`
  - `onGridMenuBeforeMenuShow`
  - `onGridMenuAfterMenuShow`
  - `onGridMenuClearAllPinning`
  - `onGridMenuClearAllFilters`
  - `onGridMenuClearAllSorting`
  - `onGridMenuCommand`

#### SlickHeaderButtons (extension)
  - `onHeaderButtonCommand`

#### SlickHeaderMenu (extension)
  - `onHeaderMenuHideColumns`
  - `onHeaderMenuCommand`
  - `onHeaderMenuColumnResizeByContent`
  - `onHeaderMenuBeforeMenuShow`
  - `onHeaderMenuAfterMenuShow`

#### Filter Service
   - `onBeforeFilterClear`
   - `onBeforeSearchChange`
   - `onFilterCleared`

#### Grid Service
  - `onHeaderMenuHideColumns`
  - `onItemAdded`
  - `onItemDeleted`
  - `onItemUpdated`
  - `onItemUpserted`

#### GridState Service
  - `onFullResizeByContentRequested`
  - `onGridStateChanged`

#### Pagination Service
  - `onBeforePaginationChange`

#### Resizer Service
  - `onGridBeforeResize`
  - `onGridAfterResize`
  - `onBeforeResizeByContent`
  - `onAfterResizeByContent`

#### Sort Service
  - `onSortCleared`
  - `onSortChanged`
  - `onBeforeSortChange`

#### TreeData Service
  - `onTreeFullToggleStart`
  - `onTreeFullToggleEnd`
  - `onTreeItemToggled`

#### SlickVanillaGridBundle
  - `onBeforeGridDestroy`
  - `onAfterGridDestroyed`
  - `onBeforeGridCreate`
  - `onDataviewCreated`
  - `onGridCreated`
  - `onSlickerGridCreated`
  - `onGridStateChanged`

#### SlickGrid
  - `onActiveCellChanged`
  - `onActiveCellPositionChanged`
  - `onAddNewRow`
  - `onAutosizeColumns`
  - `onBeforeAppendCell`
  - `onBeforeCellEditorDestroy`
  - `onBeforeColumnsResize`
  - `onBeforeDestroy`
  - `onBeforeEditCell`
  - `onBeforeFooterRowCellDestroy`
  - `onBeforeHeaderCellDestroy`
  - `onBeforeHeaderRowCellDestroy`
  - `onBeforeSetColumns`
  - `onBeforeSort`
  - `onBeforeUpdateColumns`
  - `onCellChange`
  - `onCellCssStylesChanged`
  - `onClick`
  - `onColumnsReordered`
  - `onColumnsDrag`
  - `onColumnsResized`
  - `onColumnsResizeDblClick`
  - `onCompositeEditorChange`
  - `onContextMenu`
  - `onDrag`
  - `onDblClick`
  - `onDragInit`
  - `onDragStart`
  - `onDragEnd`
  - `onFooterClick`
  - `onFooterContextMenu`
  - `onFooterRowCellRendered`
  - `onHeaderCellRendered`
  - `onHeaderClick`
  - `onHeaderContextMenu`
  - `onHeaderMouseEnter`
  - `onHeaderMouseLeave`
  - `onHeaderRowCellRendered`
  - `onHeaderRowMouseEnter`
  - `onHeaderRowMouseLeave`
  - `onKeyDown`
  - `onMouseEnter`
  - `onMouseLeave`
  - `onRendered`
  - `onScroll`
  - `onSelectedRowsChanged`
  - `onSetOptions`
  - `onActivateChangedOptions`
  - `onSort`
  - `onValidationError`
  - `onViewportChanged`

#### SlickDataView
  - `onBeforePagingInfoChanged`
  - `onGroupExpanded`
  - `onGroupCollapsed`
  - `onPagingInfoChanged`
  - `onRowCountChanged`
  - `onRowsChanged`
  - `onRowsOrCountChanged`
  - `onSelectedRowIdsChanged`
  - `onSetItemsCalled`