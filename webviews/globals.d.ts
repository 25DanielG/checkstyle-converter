import * as _vscode from "vscode";

declare global {
    const tsvscode: {
        postMessage: ({ type: string, value: any }) => void;
        getState: () => any;
        setState: (state: any) => void;
    };
    const SE: {
        init: (options: Object) => void;
        authenticate: (options: Object) => void;
    };
    const apiBaseUrl: string;
}