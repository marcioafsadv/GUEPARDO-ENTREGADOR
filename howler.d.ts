declare module 'howler' {
    export class Howl {
        constructor(options: any);
        play(id?: string): string;
        playing(id?: string): boolean;
        pause(id?: string): this;
        stop(id?: string): this;
        mute(muted?: boolean, id?: string): this;
        volume(volume?: number, id?: string): any;
        fade(from: number, to: number, duration: number, id?: string): this;
        rate(rate?: number, id?: string): any;
        seek(seek?: number, id?: string): any;
        loop(loop?: boolean, id?: string): any;
        state(): 'unloaded' | 'loading' | 'loaded';
        unload(): void;
        on(event: string, callback: Function, id?: string): this;
        once(event: string, callback: Function, id?: string): this;
        off(event: string, callback: Function, id?: string): this;
        load(): this;
    }
}
