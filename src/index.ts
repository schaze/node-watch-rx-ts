import { bindNodeCallback, Observable } from "rxjs";
import { basename, dirname, extname, join } from 'path';
import { readFile } from "fs";
import { watch, WatchOptions } from "chokidar";

// Typescript version of: https://github.com/tools-rx/watch-rx

export const readFileRx: (path: string, encoding: BufferEncoding) => Observable<string> = bindNodeCallback(
    (path: string, encoding: BufferEncoding, callback: (error: Error, data: string) => void) => readFile(path, { encoding }, callback));

export function watchRx(paths: string | ReadonlyArray<string>, options: WatchOptions): Observable<GlobResultFile> {
    options = options || {}
    const basedir = options.cwd || process.cwd()

    return new Observable((observer) => {
        let isFinished = false

        const watcher = watch(paths, options)
        const nextItem = (event) => (name) => observer.next(new GlobResultFile(
            event,
            basedir,
            name.replace(/\\/g, '/')
        ));

        ['add', 'change', 'unlink', 'addDir', 'unlinkDir'].forEach(event => {
            watcher.on(event, nextItem(event))
        })

        watcher.on('error', err => {
            isFinished = true
            observer.error(err)
            closeWatcher()
        })

        return () => {
            if (!isFinished) {
                closeWatcher()
            }
        }

        // Node doesn't exit after closing watchers
        // https://github.com/paulmillr/chokidar/issues/434
        function closeWatcher() {
            watcher.close()
        }
    })
}

export class GlobResultFile {


    constructor(public event: 'add' | 'addDir' | 'change' | 'unlink' | 'unlinkDir', public basedir, public name: string) { }

    get fullname() {
        if (this.hasName) {
            return join(this.basedir || '', this.name)
        }
    }

    get basename() {
        if (this.hasName) {
            return basename(this.name)
        }
    }

    get dirname() {
        if (this.hasName) {
            return dirname(this.fullname)
        }
    }

    get extname() {
        if (this.hasName) {
            return extname(this.name)
        }
    }

    get hasName() {
        return (!!this.basedir && !!this.name) || !!this.name
    }
}