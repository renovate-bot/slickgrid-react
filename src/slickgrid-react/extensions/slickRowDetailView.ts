import {
  addToArrayWhenNotExists,
  type EventSubscription,
  type OnBeforeRowDetailToggleArgs,
  type OnRowBackToViewportRangeArgs,
  SlickEventData,
  type SlickGrid,
  SlickRowSelectionModel,
  unsubscribeAll,
} from '@slickgrid-universal/common';
import { type EventPubSubService } from '@slickgrid-universal/event-pub-sub';
import { SlickRowDetailView as UniversalSlickRowDetailView } from '@slickgrid-universal/row-detail-view-plugin';
import type { Root } from 'react-dom/client';

import type { GridOption, RowDetailView, ViewModelBindableInputData } from '../models/index';
import { createReactComponentDynamically } from '../services/reactUtils';

const ROW_DETAIL_CONTAINER_PREFIX = 'container_';
const PRELOAD_CONTAINER_PREFIX = 'container_loading';

export interface CreatedView {
  id: string | number;
  dataContext: any;
  root: Root | null;
  rendered?: boolean;
}
// interface SRDV extends React.Component<Props, State>, UniversalSlickRowDetailView {}s

export class SlickRowDetailView extends UniversalSlickRowDetailView {
  protected _component?: any;
  protected _preloadComponent?: any;
  protected _preloadRoot?: Root;
  protected _views: CreatedView[] = [];
  protected _subscriptions: EventSubscription[] = [];
  protected _userProcessFn?: (item: any) => Promise<any>;
  protected gridContainerElement!: HTMLElement;
  _root?: Root;

  constructor(
    private readonly eventPubSubService: EventPubSubService,
  ) {
    super(eventPubSubService);
  }

  get addonOptions() {
    return this.getOptions();
  }

  protected get datasetIdPropName(): string {
    return this.gridOptions.datasetIdPropertyName || 'id';
  }

  get gridOptions(): GridOption {
    return (this._grid?.getOptions() || {}) as GridOption;
  }

  get rowDetailViewOptions(): RowDetailView | undefined {
    return this.gridOptions.rowDetailView;
  }

  /** Dispose of the RowDetailView Extension */
  dispose() {
    this.disposeAllViewComponents();
    unsubscribeAll(this._subscriptions);
    super.dispose();
  }

  /** Dispose of all the opened Row Detail Panels Components */
  disposeAllViewComponents() {
    do {
      const view = this._views.pop();
      if (view) {
        this.disposeView(view);
      }
    } while (this._views.length > 0);
  }

  /** Get the instance of the SlickGrid addon (control or plugin). */
  getAddonInstance(): SlickRowDetailView | null {
    return this;
  }

  init(grid: SlickGrid) {
    this._grid = grid;
    super.init(this._grid);
    this.gridContainerElement = grid.getContainerNode();
    this.register(grid?.getSelectionModel() as SlickRowSelectionModel);
  }

  /**
   * Create the plugin before the Grid creation, else it will behave oddly.
   * Mostly because the column definitions might change after the grid creation
   */
  register(rowSelectionPlugin?: SlickRowSelectionModel) {
    if (typeof this.gridOptions.rowDetailView?.process === 'function') {
      // we need to keep the user "process" method and replace it with our own execution method
      // we do this because when we get the item detail, we need to call "onAsyncResponse.notify" for the plugin to work
      this._userProcessFn = this.gridOptions.rowDetailView.process as (item: any) => Promise<any>;                // keep user's process method
      this.addonOptions.process = (item) => this.onProcessing(item);  // replace process method & run our internal one
    } else {
      throw new Error('[Slickgrid-React] You need to provide a "process" function for the Row Detail Extension to work properly');
    }

    if (this._grid && this.gridOptions?.rowDetailView) {
      // load the Preload & RowDetail Templates (could be straight HTML or React Components)
      // when those are React Components, we need to create View Component & provide the html containers to the Plugin (preTemplate/postTemplate methods)
      if (!this.gridOptions.rowDetailView.preTemplate) {
        this._preloadComponent = this.gridOptions?.rowDetailView?.preloadComponent;
        this.addonOptions.preTemplate = () => this._grid.sanitizeHtmlString(`<div class="${PRELOAD_CONTAINER_PREFIX}"></div>`) as string;
      }
      if (!this.gridOptions.rowDetailView.postTemplate) {
        this._component = this.gridOptions?.rowDetailView?.viewComponent;
        this.addonOptions.postTemplate = (itemDetail: any) => this._grid.sanitizeHtmlString(`<div class="${ROW_DETAIL_CONTAINER_PREFIX}${itemDetail[this.datasetIdPropName]}"></div>`) as string;
      }

      if (this._grid && this.gridOptions) {
        // this also requires the Row Selection Model to be registered as well
        if (!rowSelectionPlugin || !this._grid.getSelectionModel()) {
          rowSelectionPlugin = new SlickRowSelectionModel(this.gridOptions.rowSelectionOptions || { selectActiveRow: true });
          this._grid.setSelectionModel(rowSelectionPlugin);
        }

        // hook all events
        if (this._grid && this.rowDetailViewOptions) {
          if (this.rowDetailViewOptions.onExtensionRegistered) {
            this.rowDetailViewOptions.onExtensionRegistered(this);
          }

          this._eventHandler.subscribe(this.onAsyncResponse, (event, args) => {
            if (typeof this.rowDetailViewOptions?.onAsyncResponse === 'function') {
              this.rowDetailViewOptions.onAsyncResponse(event, args);
            }
          });

          this._eventHandler.subscribe(this.onAsyncEndUpdate, async (event, args) => {
            // dispose preload if exists
            this._preloadRoot?.unmount();

            // triggers after backend called "onAsyncResponse.notify()"
            await this.renderViewModel(args?.item);

            if (typeof this.rowDetailViewOptions?.onAsyncEndUpdate === 'function') {
              this.rowDetailViewOptions.onAsyncEndUpdate(event, args);
            }
          });

          this._eventHandler.subscribe(this.onAfterRowDetailToggle, async (event, args) => {
            // display preload template & re-render all the other Detail Views after toggling
            // the preload View will eventually go away once the data gets loaded after the "onAsyncEndUpdate" event
            await this.renderPreloadView(args.item);

            if (typeof this.rowDetailViewOptions?.onAfterRowDetailToggle === 'function') {
              this.rowDetailViewOptions.onAfterRowDetailToggle(event, args);
            }
          });

          this._eventHandler.subscribe(this.onBeforeRowDetailToggle, (event, args) => {
            // before toggling row detail, we need to create View Component if it doesn't exist
            this.handleOnBeforeRowDetailToggle(event, args);

            if (typeof this.rowDetailViewOptions?.onBeforeRowDetailToggle === 'function') {
              return this.rowDetailViewOptions.onBeforeRowDetailToggle(event, args);
            }
            return true;
          });

          this._eventHandler.subscribe(this.onRowBackToViewportRange, async (event, args) => {
            // when row is back to viewport range, we will re-render the View Component(s)
            await this.handleOnRowBackToViewportRange(event, args);

            if (typeof this.rowDetailViewOptions?.onRowBackToViewportRange === 'function') {
              this.rowDetailViewOptions.onRowBackToViewportRange(event, args);
            }
          });

          this._eventHandler.subscribe(this.onBeforeRowOutOfViewportRange, (event, args) => {
            if (typeof this.rowDetailViewOptions?.onBeforeRowOutOfViewportRange === 'function') {
              this.rowDetailViewOptions.onBeforeRowOutOfViewportRange(event, args);
            }
            this.disposeView(args.item);
          });

          this._eventHandler.subscribe(this.onRowOutOfViewportRange, (event, args) => {
            if (typeof this.rowDetailViewOptions?.onRowOutOfViewportRange === 'function') {
              this.rowDetailViewOptions.onRowOutOfViewportRange(event, args);
            }
          });

          // --
          // hook some events needed by the Plugin itself

          // we need to redraw the open detail views if we change column position (column reorder)
          this.eventHandler.subscribe(this._grid.onColumnsReordered, this.redrawAllViewComponents.bind(this, false));

          // on row selection changed, we also need to redraw
          if (this.gridOptions.enableRowSelection || this.gridOptions.enableCheckboxSelector) {
            this._eventHandler.subscribe(this._grid.onSelectedRowsChanged, this.redrawAllViewComponents.bind(this, false));
          }

          // on column sort/reorder, all row detail are collapsed so we can dispose of all the Views as well
          this._eventHandler.subscribe(this._grid.onSort, this.disposeAllViewComponents.bind(this));

          // on filter changed, we need to re-render all Views
          this._subscriptions.push(
            this.eventPubSubService?.subscribe(['onFilterChanged', 'onGridMenuColumnsChanged', 'onColumnPickerColumnsChanged'], this.redrawAllViewComponents.bind(this, false)),
            this.eventPubSubService?.subscribe(['onGridMenuClearAllFilters', 'onGridMenuClearAllSorting'], () => window.setTimeout(() => this.redrawAllViewComponents())),
          );
        }
      }
    }

    return this;
  }

  /** Redraw (re-render) all the expanded row detail View Components */
  async redrawAllViewComponents(forceRedraw = false) {
    this.resetRenderedRows();
    const promises: Promise<void>[] = [];
    this._views.forEach((view) => {
      if (!view.rendered || forceRedraw) {
        forceRedraw && this.disposeViewComponent(view);
        promises.push(this.redrawViewComponent(view))
      }
    });
    await Promise.all(promises);
  }

  /** Render all the expanded row detail View Components */
  async renderAllViewModels() {
    const promises: Promise<void>[] = [];
    Array.from(this._views)
      .filter((x) => x?.dataContext)
      .forEach((x) => promises.push(this.renderViewModel(x.dataContext)));
    await Promise.all(promises);
  }

  /** Redraw the necessary View Component */
  async redrawViewComponent(view: CreatedView) {
    const containerElements = this.gridContainerElement.getElementsByClassName(`${ROW_DETAIL_CONTAINER_PREFIX}${view.id}`);
    if (containerElements?.length >= 0) {
      await this.renderViewModel(view.dataContext);
    }
  }

  /** Render (or re-render) the View Component (Row Detail) */
  async renderPreloadView(item: any) {
    const containerElements = this.gridContainerElement.getElementsByClassName(`${PRELOAD_CONTAINER_PREFIX}`);
    if (this._preloadComponent && containerElements?.length) {
      // render row detail
      const bindableData = {
        model: item,
        addon: this,
        grid: this._grid,
        dataView: this.dataView,
        parent: this.rowDetailViewOptions?.parent,
      } as ViewModelBindableInputData;
      const detailContainer = document.createElement('section');
      containerElements[containerElements.length - 1]!.appendChild(detailContainer);

      const { root } = await createReactComponentDynamically(this._preloadComponent, detailContainer as HTMLElement, bindableData);
      this._preloadRoot = root;
    }
  }

  /** Render (or re-render) the View Component (Row Detail) */
  async renderViewModel(item: any) {
    const containerElements = this.gridContainerElement.getElementsByClassName(`${ROW_DETAIL_CONTAINER_PREFIX}${item[this.datasetIdPropName]}`);
    if (this._component && containerElements?.length) {
      // render row detail
      const bindableData = {
        model: item,
        addon: this,
        grid: this._grid,
        dataView: this.dataView,
        parent: this.rowDetailViewOptions?.parent,
      } as ViewModelBindableInputData;
      const viewObj = this._views.find(obj => obj.id === item[this.datasetIdPropName]);

      // load our Row Detail React Component dynamically, typically we would want to use `root.render()` after the preload component (last argument below)
      // BUT the root render doesn't seem to work and shows a blank element, so we'll use `createRoot()` every time even though it shows a console log in Dev
      // that is the only way I got it working so let's use it anyway and console warnings are removed in production anyway
      const { root } = createReactComponentDynamically(this._component, containerElements[containerElements.length - 1] as HTMLElement, bindableData /*, viewObj?.root */);
      if (viewObj) {
        viewObj.root = root;
        viewObj.rendered = true;
      } else {
        this.addViewInfoToViewsRef(item, root);
      }
    }
  }

  // --
  // protected functions
  // ------------------

  protected addViewInfoToViewsRef(item: any, root: Root | null) {
    const viewInfo: CreatedView = {
      id: item[this.datasetIdPropName],
      dataContext: item,
      root,
      rendered: !!root,
    };
    addToArrayWhenNotExists(this._views, viewInfo, this.datasetIdPropName);
  }

  protected disposeView(item: any, removeFromArray = false): void {
    const foundViewIdx = this._views.findIndex((view: CreatedView) => view.id === item[this.datasetIdPropName]);
    if (foundViewIdx >= 0 && this.disposeViewComponent(this._views[foundViewIdx])) {
      if (removeFromArray) {
        this._views.splice(foundViewIdx, 1);
      }
    }
  }

  protected disposeViewComponent(expandedView: CreatedView): CreatedView | void {
    if (expandedView?.root) {
      const container = this.gridContainerElement.getElementsByClassName(`${ROW_DETAIL_CONTAINER_PREFIX}${expandedView.id}`);
      if (container?.length) {
        expandedView.root.unmount();
        container[0].textContent = '';
        return expandedView;
      }
    }
  }

  /**
   * Just before the row get expanded or collapsed we will do the following
   * First determine if the row is expanding or collapsing,
   * if it's expanding we will add it to our View Components reference array if we don't already have it
   * or if it's collapsing we will remove it from our View Components reference array
   */
  protected handleOnBeforeRowDetailToggle(_e: SlickEventData<OnBeforeRowDetailToggleArgs>, args: { grid: SlickGrid; item: any; }) {
    // expanding
    if (args?.item?.__collapsed) {
      // expanding row detail
      this.addViewInfoToViewsRef(args.item, null);
    } else {
      // collapsing, so dispose of the View
      this.disposeView(args.item, true);
    }
  }

  /** When Row comes back to Viewport Range, we need to redraw the View */
  protected async handleOnRowBackToViewportRange(_e: SlickEventData<OnRowBackToViewportRangeArgs>, args: {
    item: any;
    rowId: string | number;
    rowIndex: number;
    expandedRows: (string | number)[];
    rowIdsOutOfViewport: (string | number)[];
    grid: SlickGrid;
  }) {
    const viewModel = Array.from(this._views).find((x) => x.id === args.rowId);
    if (viewModel) {
      this.redrawViewComponent(viewModel);
    }
  }

  /**
   * notify the onAsyncResponse with the "args.item" (required property)
   * the plugin will then use item to populate the row detail panel with the "postTemplate"
   * @param item
   */
  protected notifyTemplate(item: any) {
    this.onAsyncResponse.notify({ item, itemDetail: item }, new SlickEventData(), this);
  }

  /**
   * On Processing, we will notify the plugin with the new item detail once backend server call completes
   * @param item
   */
  protected async onProcessing(item: any) {
    if (item && typeof this._userProcessFn === 'function') {
      let awaitedItemDetail: any;
      const userProcessFn = this._userProcessFn(item);

      // wait for the "userProcessFn", once resolved we will save it into the "collection"
      const response: any | any[] = await userProcessFn;

      if (response.hasOwnProperty(this.datasetIdPropName)) {
        awaitedItemDetail = response; // from Promise
      } else if (response instanceof Response && typeof response['json'] === 'function') {
        awaitedItemDetail = await response['json'](); // from Fetch
      } else if (response && response['content']) {
        awaitedItemDetail = response['content']; // from http-client
      }

      if (!awaitedItemDetail || !awaitedItemDetail.hasOwnProperty(this.datasetIdPropName)) {
        throw new Error('[Slickgrid-React] could not process the Row Detail, please make sure that your "process" callback ' +
          '(a Promise or an HttpClient call returning an Observable) returns an item object that has an "${this.datasetIdPropName}" property');
      }

      // notify the plugin with the new item details
      this.notifyTemplate(awaitedItemDetail || {});
    }
  }
}
