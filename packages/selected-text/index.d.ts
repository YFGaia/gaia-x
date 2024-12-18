type Window = {
    title: string;
    bounds: {
        x: number;
        y: number;
        width: number;
        height: number;
    };
};

type Clipboard = {
    text: string;
};

type UIA = {
    text: string;
    process: {
        pid: number;
        name: string;
        bundleIdentifier: string;
    };
};

export function getTextByClipboard(): Promise<Clipboard>;
export function getTextByUIA(): Promise<UIA>;
export function activeWindow(): Promise<Window>;