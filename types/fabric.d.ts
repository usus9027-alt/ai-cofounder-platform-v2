declare module 'fabric' {
  interface IEvent {
    target?: any;
  }

  interface FabricObject {
    set(property: string, value: any): FabricObject;
    set(options: Record<string, any>): FabricObject;
    get(property: string): any;
    toJSON(): any;
    left?: number;
    top?: number;
    scaleX?: number;
    scaleY?: number;
    angle?: number;
  }

  interface Canvas {
    add(object: any): Canvas;
    remove(object: any): Canvas;
    clear(): Canvas;
    renderAll(): Canvas;
    toJSON(): any;
    loadFromJSON(json: any, callback?: () => void): void;
    getObjects(): any[];
    setWidth(width: number): Canvas;
    setHeight(height: number): Canvas;
    on(eventName: string, handler: (e: IEvent) => void): void;
    off(eventName: string, handler?: (e: IEvent) => void): void;
    dispose(): void;
  }

  export class Canvas {
    constructor(element: HTMLCanvasElement | string, options?: any);
    add(object: any): Canvas;
    remove(object: any): Canvas;
    clear(): Canvas;
    renderAll(): Canvas;
    toJSON(): any;
    loadFromJSON(json: any, callback?: () => void): void;
    getObjects(): any[];
    setWidth(width: number): Canvas;
    setHeight(height: number): Canvas;
    on(eventName: string, handler: (e: IEvent) => void): void;
    off(eventName: string, handler?: (e: IEvent) => void): void;
    dispose(): void;
  }

  export class Text {
    constructor(text: string, options?: any);
    set(property: string, value: any): Text;
    set(options: Record<string, any>): Text;
    get(property: string): any;
    left?: number;
    top?: number;
    scaleX?: number;
    scaleY?: number;
    angle?: number;
  }

  export class Rect {
    constructor(options?: any);
    set(property: string, value: any): Rect;
    set(options: Record<string, any>): Rect;
    get(property: string): any;
    left?: number;
    top?: number;
    scaleX?: number;
    scaleY?: number;
    angle?: number;
  }

  export class Circle {
    constructor(options?: any);
    set(property: string, value: any): Circle;
    set(options: Record<string, any>): Circle;
    get(property: string): any;
    left?: number;
    top?: number;
    scaleX?: number;
    scaleY?: number;
    angle?: number;
  }

  export class Line {
    constructor(coords: number[], options?: any);
    set(property: string, value: any): Line;
    set(options: Record<string, any>): Line;
    get(property: string): any;
    left?: number;
    top?: number;
    scaleX?: number;
    scaleY?: number;
    angle?: number;
  }
}
