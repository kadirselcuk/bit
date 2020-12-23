import type { GraphqlUI } from '@teambit/graphql';
import { GraphqlAspect } from '@teambit/graphql';
import { Slot, SlotRegistry } from '@teambit/harmony';
import type { ReactRouterUI } from '@teambit/react-router';
import { ReactRouterAspect } from '@teambit/react-router';
// WIP!
import { getDataFromTree } from '@apollo/react-ssr';

import React, { ReactNode } from 'react';
import ReactDOM from 'react-dom';
// WIP!
import ReactDOMServer from 'react-dom/server';

import { Compose } from './compose';
import { UIRootFactory } from './ui-root.ui';
import { UIAspect, UIRuntime } from './ui.aspect';
import { ClientContext } from './ui/client-context';
import { Html } from './ssr/html';
import type { SsrContent } from './ssr/ssr-content';

type HudSlot = SlotRegistry<ReactNode>;
type ContextSlot = SlotRegistry<ContextType>;
export type UIRootRegistry = SlotRegistry<UIRootFactory>;

type ContextType = React.JSXElementConstructor<React.PropsWithChildren<any>>;

// import * as serviceWorker from './serviceWorker';

// If you want your app to work offline and load faster, you can change
// unregister() to register() below. Note this comes with some pitfalls.
// Learn more about service workers: https://bit.ly/CRA-PWA
// serviceWorker.unregister();

/**
 * extension
 */
export class UiUI {
  constructor(
    /**
     * GraphQL extension.
     */
    private graphql: GraphqlUI,

    /**
     * react-router extension.
     */
    private router: ReactRouterUI,
    /**
     * ui root registry.
     */
    private uiRootSlot: UIRootRegistry,
    /** slot for overlay ui elements */
    private hudSlot: HudSlot,
    /** slot for context provider elements */
    private contextSlot: ContextSlot
  ) {}

  async render(rootExtension: string) {
    const GraphqlProvider = this.graphql.getProvider;
    const rootFactory = this.getRoot(rootExtension);
    if (!rootFactory) throw new Error(`root: ${rootExtension} was not found`);
    const uiRoot = rootFactory();
    const routes = this.router.renderRoutes(uiRoot.routes, { initialLocation: window.location.href });
    const hudItems = this.hudSlot.values();
    const contexts = this.contextSlot.values();

    ReactDOM.render(
      <GraphqlProvider>
        <ClientContext>
          <Compose components={contexts}>
            {hudItems}
            {routes}
          </Compose>
        </ClientContext>
      </GraphqlProvider>,
      document.getElementById('root')
    );
  }

  // WORK IN PROGRESS.
  renderSsr(rootExtension: string, { assets, browser }: SsrContent = {}) {
    const GraphqlProvider = this.graphql.getSsrProvider();
    const rootFactory = this.getRoot(rootExtension);
    if (!rootFactory) throw new Error(`root: ${rootExtension} was not found`);

    const uiRoot = rootFactory();
    const routes = this.router.renderRoutes(uiRoot.routes, { initialLocation: browser?.location.url });
    const hudItems = this.hudSlot.values();
    const contexts = this.contextSlot.values();

    // maybe we should use internal url?
    const serverUrl = browser?.location.origin
      ? `${browser?.location.origin}/graphql`
      : 'http://localhost:3000/graphql';

    const client = this.graphql.createSsrClient({ serverUrl, cookie: browser?.cookie });

    const app = (
      <GraphqlProvider client={client}>
        <ClientContext>
          <Compose components={contexts}>
            {hudItems}
            {routes}
          </Compose>
        </ClientContext>
      </GraphqlProvider>
    );

    return getDataFromTree(app)
      .then(() => {
        const state = {
          'gql-cache': JSON.stringify(client.extract()),
          // TODO - .replace(/</g, '\\u003c')
        };

        const content = ReactDOMServer.renderToString(
          <Html title="bit dev ssred!" assets={{ ...assets, state }}>
            {app}
          </Html>
        );

        return `<!DOCTYPE html>${content}`;
      })
      .catch((err) => console.error(err)); // TODO
  }

  /** adds elements to the Heads Up Display */
  registerHudItem = (element: ReactNode) => {
    this.hudSlot.register(element);
  };

  // ** adds global context at the ui root */
  registerContext(context: ContextType) {
    this.contextSlot.register(context);
  }

  registerRoot(uiRoot: UIRootFactory) {
    return this.uiRootSlot.register(uiRoot);
  }

  private getRoot(rootExtension: string) {
    return this.uiRootSlot.get(rootExtension);
  }

  static slots = [Slot.withType<UIRootFactory>(), Slot.withType<ReactNode>(), Slot.withType<ContextType>()];

  static dependencies = [GraphqlAspect, ReactRouterAspect];

  static runtime = UIRuntime;

  static async provider(
    [graphql, router]: [GraphqlUI, ReactRouterUI],
    config,
    [uiRootSlot, hudSlot, contextSlot]: [UIRootRegistry, HudSlot, ContextSlot]
  ) {
    return new UiUI(graphql, router, uiRootSlot, hudSlot, contextSlot);
  }
}

UIAspect.addRuntime(UiUI);
