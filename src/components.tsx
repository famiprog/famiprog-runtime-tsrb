import { Button } from "@mantine/core";
import React, { useEffect, useState, type JSXElementConstructor, type ReactElement } from "react";
import Moveable from "react-moveable";
import Selecto from "react-selecto";
import { proxy, ref, useSnapshot } from "valtio";

console.log("Hello world runtime-tsrb v1");

export interface RadComponent<P> {
    reactElement: ReactElement;
    key?: string;
    propsValtio: P;
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

function logNewDimensions(target: HTMLElement | SVGElement) {
    const container = document.querySelector(".selecto-area");
    if (!container) {
        return;
    }
    const c = container.getBoundingClientRect();
    const r = target.getBoundingClientRect();
    console.log({
        left: r.left - c.left,
        top: r.top - c.top,
        width: r.width,
        height: r.height,
    });
}

export function RadEditor({ screen }: { screen: any }) {
    const [processed, setProcessed] = useState(false);

    useEffect(() => {
        screen.root.propsValtio.className = "selecto-area";
        screen.root.propsValtio.style = {
            ...screen.root.propsValtio.style,
            backgroundImage: `linear-gradient(to right, #dee2e6 1px, transparent 1px), linear-gradient(to bottom, #dee2e6 1px, transparent 1px)`,
            backgroundSize: `${GRID_SIZE}px ${GRID_SIZE}px`,
        }
        for (const key in screen) {
            if (key === "root" || !screen[key].propsValtio) {
                continue;
            }
            screen[key].propsValtio.className = "target";
        }
        setProcessed(true);
    }, []);

    const GRID_SIZE = 20;
    const [targets, setTargets] = React.useState<Array<HTMLElement | SVGElement>>([]);
    const moveableRef = React.useRef<Moveable>(null);
    const selectoRef = React.useRef<Selecto>(null);

    return processed && (
        <>
            {screen.root.reactElement}
            <>
                <Moveable
                    ref={moveableRef}
                    target={targets}
                    draggable={true}
                    throttleDrag={1}
                    edgeDraggable={false}
                    startDragRotate={0}
                    throttleDragRotate={0}
                    resizable={true}
                    keepRatio={false}
                    throttleResize={1}
                    renderDirections={["nw", "n", "ne", "w", "e", "sw", "s", "se"]}
                    rotatable={true}
                    throttleRotate={0}
                    rotationPosition={"top"}
                    snappable={true}
                    snapContainer={".selecto-area"}
                    snapGridWidth={GRID_SIZE}
                    snapGridHeight={GRID_SIZE}
                    snapGridAll={true}
                    snapThreshold={GRID_SIZE}
                    isDisplayGridGuidelines={true}
                    onClickGroup={e => {
                        selectoRef.current!.clickTarget(e.inputEvent, e.inputTarget);
                    }}
                    onRender={e => {
                        e.target.style.cssText += e.cssText;
                    }}
                    onRenderGroup={e => {
                        e.events.forEach(ev => {
                            ev.target.style.cssText += ev.cssText;
                        });
                    }}
                    onRenderEnd={e => {
                        logNewDimensions(e.target);
                    }}
                    onRenderGroupEnd={e => {
                        e.events.forEach(ev => logNewDimensions(ev.target));
                    }}
                />
                <Selecto
                    ref={selectoRef}
                    dragContainer={".selecto-area"}
                    selectableTargets={[".selecto-area .target"]}
                    hitRate={0}
                    selectByClick={true}
                    selectFromInside={false}
                    toggleContinueSelect={["shift"]}
                    ratio={0}
                    onDragStart={e => {
                        const target = e.inputEvent.target as Element;
                        if (
                            moveableRef.current!.isMoveableElement(target)
                            || targets.some(t => t === target || t.contains(target))
                        ) {
                            e.stop();
                        }
                    }}
                    onSelect={e => {
                        if (e.isDragStartEnd) {
                            return;
                        }
                        setTargets(e.selected);
                    }}
                    onSelectEnd={e => {
                        if (e.isDragStartEnd) {
                            e.inputEvent.preventDefault();
                            moveableRef.current!.waitToChangeTarget().then(() => {
                                moveableRef.current!.dragStart(e.inputEvent);
                            });
                        }
                        setTargets(e.selected);
                    }}
                />
            </>
        </>
    );
}

// type experiments: how to extract the props
// must have: Button<"button"> and not Button, because of polymorphic component
type P = React.ComponentProps<typeof Button<"button">>;
let p: P = {};
p.color;
p.onClick;

let pa: Button.Props;
// pa.onclick
type P1 = React.ComponentProps<"button">;
let p1: P1;
// p1.onClick

const props2 = Rad.createRadComponent(Button<"button">);
props2.propsValtio.color;