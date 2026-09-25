import React, { type JSXElementConstructor, type ReactElement } from "react";
import { proxy, ref, useSnapshot } from "valtio";

export interface RadComponent<P> {
    reactElement: ReactElement;
    key?: string;
    propsValtio: P;
    children?: RadComponent<any>[];
}

export class Rad {

    static nextKey = 1;

    static createRadComponent<C extends React.ElementType>(ReactComponent: C) {
        type P = React.ComponentProps<C>;

        function Hoc({ propsValtio, ...rest }: { propsValtio: P }) {
            const snap = useSnapshot(propsValtio);
            // rest for the case e.g. of <Menu><Menu.Target><Button />...
            // this will inject in <Button /> a click handler to open the menu. We want this to arrive in
            // the actual component; otherwise: the popup doesn't open
            return <ReactComponent {...snap} {...rest} />
        }

        const propsValtio = proxy<P>({} as P);
        return {
            reactElement: <Hoc key={Rad.nextKey++} propsValtio={propsValtio} />,
            propsValtio
        } as RadComponent<P>;
    }

    static createRadComponentPlaceholder<C extends React.ElementType>(ReactComponent: C) {
        type P = React.ComponentProps<C>;
        return {
            expectedElementType: ReactComponent
        } as unknown as RadComponent<P>;
    }

    static addRadComponentChild<C extends RadComponent<any>>(parent: RadComponent<any>, child: C, callback?: (newlyAddedChild: C) => void) {
        if (!parent.propsValtio.children) {
            parent.propsValtio.children = [];
        }
        parent.propsValtio.children.push(ref(child.reactElement));

        if (!parent.children) {
            parent.children = [];
        }
        parent.children.push(child);

        callback?.(child);
    }

    // TODO 🟠: compile error workaround: second generic type is by default string | JSXElementConstructor<any>. 
    // But Rad.createRadComponent() doesn't like string. For the moment I remove string. To investigate.
    static convertReactElementsToRadComponents(element: ReactElement<any, JSXElementConstructor<any>>, componentRefs: Record<string, any>) {
        const comp = Rad.createRadComponent(element.type);

        let childrenElements: undefined | ReactElement<any, JSXElementConstructor<any>>[] = element.props["children"];
        if (typeof childrenElements === "object" && (childrenElements as any).type && (childrenElements as any).props) {
            childrenElements = [childrenElements as any];
        }
        if (!(Array.isArray(childrenElements) && childrenElements.length > 0 && childrenElements[0].type && childrenElements[0].props)) {
            childrenElements = undefined;
        }

        for (const prop in element.props) {
            const value = element.props[prop];
            if (prop === "children" && childrenElements) {
                continue;
            }
            if (prop === "data-comp") {
                if (!componentRefs[value]) {
                    throw new Error("Sanity check error. 'componentRefs' doesn't contain prop: " + value);
                } else if (componentRefs[value]["expectedElementType"] !== element.type) {
                    const message = `Santity check error. React component type mismatch in 'componentRefs.${value}'`;
                    console.error(message);
                    console.error("Expected:", componentRefs[value]["expectedElementType"]);
                    console.error("Actual:", element.type);
                    throw new Error(message + ". More info in console (probably lines just above)");
                }
                componentRefs[value] = comp;
                continue;
            }
            comp.propsValtio[prop] = value;
        }

        if (childrenElements) {
            for (const child of childrenElements) {
                const childComp = this.convertReactElementsToRadComponents(child, componentRefs);
                Rad.addRadComponentChild(comp, childComp);
            }
        }

        return comp;
    }
}