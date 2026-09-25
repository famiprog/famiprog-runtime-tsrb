import React, { useEffect, useState } from "react";
import Moveable from "react-moveable";
import Selecto from "react-selecto";
import { RadComponent } from "./Rad";

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

// TODO 🟠 use types; take some arg; don't suppose "root" exists
export function RadEditor({ screen }: { screen: any }) {
    const [processed, setProcessed] = useState(false);

    useEffect(() => {
        screen.root.propsValtio.className = "selecto-area";
        screen.root.propsValtio.style = {
            ...screen.root.propsValtio.style,
            backgroundImage: `linear-gradient(to right, #dee2e6 1px, transparent 1px), linear-gradient(to bottom, #dee2e6 1px, transparent 1px)`,
            backgroundSize: `${GRID_SIZE}px ${GRID_SIZE}px`,
        }
        // for (const key in screen) {
        //     if (key === "root" || !screen[key].propsValtio) {
        //         continue;
        //     }
        //     screen[key].propsValtio.className = "target";
        // }
        for (const child of (screen.root as RadComponent<any>).children!) {
            child.propsValtio.className = "target";
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