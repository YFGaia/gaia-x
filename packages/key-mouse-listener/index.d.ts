import EventEmitter from 'events';

interface MouseEvent {
    type: string;
    x: number;
    y: number;
    button?: number;
    wheelDelta?: number;
}

interface KeyboardEvent {
    type: 'keydown' | 'keyup';
    keyCode: number;
    scanCode: number;
    extended: boolean;
}

function createMouseHook(callback: (event: MouseEvent) => void): boolean;
function enableMouseMove(): void;
function disableMouseMove(): void;
function pauseMouseEvents(): boolean;
function resumeMouseEvents(): boolean;

function createKeyboardHook(callback: (event: KeyboardEvent) => void): boolean;
function destroyKeyboardHook(): boolean;
function pauseKeyEvents(): boolean;
function resumeKeyEvents(): boolean;

export const mouseEvents: MouseEvents;
export const keyboardEvents: KeyboardEvents;

class MouseEvents extends EventEmitter {
    constructor();
    getPaused(): boolean;
    pauseMouseEvents(): boolean;
    resumeMouseEvents(): boolean;
}

class KeyboardEvents extends EventEmitter {
    constructor();
    getPaused(): boolean;
    pauseKeyEvents(): boolean;
    resumeKeyEvents(): boolean;
}