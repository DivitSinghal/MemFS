/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/


import * as path from 'path';
import * as vscode from 'vscode';
const axios = require('axios');

export class File implements vscode.FileStat {

    type: vscode.FileType;
    ctime: number;
    mtime: number;
    size: number;

    name: string;
    data?: Uint8Array;

    constructor(name: string) {
        this.type = vscode.FileType.File;
        this.ctime = Date.now();
        this.mtime = Date.now();
        this.size = 0;
        this.name = name;
    }
}

export class Directory implements vscode.FileStat {

    type: vscode.FileType;
    ctime: number;
    mtime: number;
    size: number;

    name: string;
    entries: Map<string, File | Directory>;

    constructor(name: string) {
        this.type = vscode.FileType.Directory;
        this.ctime = Date.now();
        this.mtime = Date.now();
        this.size = 0;
        this.name = name;
        this.entries = new Map();
    }
}

export type Entry = File | Directory;

const API_ROOT = "https://instabase.com/api/v1"
const DRIVE_API_ROOT = 'drives'
const root_path = "DivitSinghal/UDF_Guide/fs/Instabase Drive"
const API_TOKEN = "fuCMS6PBhMHMbHsavmUcRdDQIcLYwR"

export class MemFS implements vscode.FileSystemProvider {

    root = new Directory('');

    // --- manage file metadata

    stat(uri: vscode.Uri): vscode.FileStat {
        console.log("Inside Stat uri: ", uri);
        return this._lookup(uri, false);
    }

    // readDirectory(uri: vscode.Uri): [string, vscode.FileType][] {
    async readDirectory(uri: vscode.Uri) {

        console.log("Inside readDirectory")
        console.log("uri: ", uri);
        if(uri.path.includes('/Refiner 5 Lesson')){
            console.log("IB File")
            let path = root_path + uri.path
            const url = `${API_ROOT}/${DRIVE_API_ROOT}/${path}`
            console.log("url: ", url);
            var api_args={
                type: 'folder',
                get_content: true,
                get_metadata: true,
                start_page_token: ''
            }
            const options = {
                headers: {
                    'Authorization': `Bearer ${API_TOKEN}`,
                    'Instabase-API-Args': JSON.stringify(api_args)
                }
            }
            try {
                const res = await axios.get(url, options)
                if (res.status != 200) {
                    console.error("Error completing the request :", res)
                }
                console.log("res: ",res)
                var retData = res.data
                if (retData.status !== 'OK') {
                	console.error(`Could not list folder content at ${path}: ${retData.msg}`)
                }
                var nodes = retData.nodes
                const result: [string, vscode.FileType][] = [];
                for (var i=0; i < nodes.length; i++) {
                    console.log("nodes[i]: ",nodes[i])
                    if(nodes[i].type === "folder"){
                        result.push([nodes[i].name,2])
                        //createDir
                        let lst = nodes[i].path.split('/')
                        const basename = lst[lst.length - 1]
                        console.log("basename: ",basename)
                        const parent = this._lookupAsDirectory(uri, false);
                        const entry = new Directory(basename);
                        parent.entries.set(entry.name, entry);
                        parent.mtime = nodes[i].metadata.modified_timestamp
                        parent.size += 1;
                    }
                    else{
                        result.push([nodes[i].name,1]);
                        ////createFile
                        // let uri_temp = JSON.parse(JSON.stringify(uri));
                        // let uri_temp = {...uri}
                        // let uri_temp = uri
                        // uri_temp.path = nodes[i].path
                        // let options: { create: 1, overwrite: 0 }
                        // let dataU8Array = new TextEncoder("utf-8").encode(nodes[i].data);
                        // this.writeFile(uri,dataU8Array,options)
                        let lst = nodes[i].path.split('/')
                        const basename = lst[lst.length - 1]
                        console.log("basename: ",basename)
                        const parent = this._lookupAsDirectory(uri, false);
                        const entry = new File(basename);
                        parent.entries.set(basename, entry);
                        parent.mtime = nodes[i].metadata.modified_timestamp
                        parent.size += 1;
                    }
                }
                console.log("result of subtree: ",result)
                return result
            } catch(err) {
                var msg = ("Error in createDriveFolder:", err)
                console.error(msg)
                console.error("URL:", url)
                console.error("options:", options)
                throw(msg)
            }
        }
        else{
            console.log("VS Code Sample File")
            const entry = this._lookupAsDirectory(uri, false);
            console.log("entry: ",entry)
            const result: [string, vscode.FileType][] = [];
            for (const [name, child] of entry.entries) {
                result.push([name, child.type]);
            }
            console.log("result of subtree: ",result)
            return result;
        }
    }

    // --- manage file contents

    async readFile(uri: vscode.Uri) {

        console.log("Inside readFile")
        console.log("uri: ", uri);
        
        if(uri.path.includes('Refiner')){
            //api call
            let path = root_path + uri.path
            const url = `${API_ROOT}/${DRIVE_API_ROOT}/${path}`
            console.log("url: ", url);

            var api_args={
                type: 'file',
                get_content: true
            }
            const options = {
                headers: {
                    'Authorization': `Bearer ${API_TOKEN}`,
                    'Instabase-API-Args': JSON.stringify(api_args)
                }
            }
            try {
                const res = await axios.get(url, options)
                if (res.status != 200) {
                    console.error("Error completing the request :", res)
                }
                var retData = res.data
                console.log("type: ",typeof retData)
                console.log("retData: ",retData)
                // return retData
                var dataU8Array = new TextEncoder("utf-8").encode(retData);
                console.log("dataU8Array: ",dataU8Array)
                return dataU8Array
            } catch(err) {
                var msg = "Error in createDriveFolder:" + err
                console.error(msg)
                console.error("URL:", url)
                console.error("options:", options)
                throw(msg)
            }
        }
        else{
            const data = this._lookupAsFile(uri, false).data;
            if (data) {
                console.log("data in Unit8Array:", data)
                return data;
            }
            throw vscode.FileSystemError.FileNotFound();
        }
    }

    async writeFile(uri: vscode.Uri, content: Uint8Array, options: { create: boolean, overwrite: boolean }) {
        
        console.log("Inside writeFile")
        console.log("uri: ", uri);
        
        
        if(uri.path.includes('Refiner')){
            //api call
            let mimeType='py'
            let ifExists='overwrite'
            let cursor=0
            let fileData=content

            let path = root_path + uri.path

            const url = `${API_ROOT}/${DRIVE_API_ROOT}/${path}`
            var api_args={
                type: 'file',
                cursor: cursor,
                if_exists: ifExists,
                mime_types: mimeType
            }
            const options = {
                headers: {
                    'Authorization': `Bearer ${API_TOKEN}`,
                    'Instabase-API-Args': JSON.stringify(api_args),
                    'Content-Type' : 'text/plain' 
                }
            }
            try {
                const res = await axios.post(url, fileData, options)
                if (res.status != 200) {
                    var msg = `Error completing the request : ${res}`
                    console.error(msg)
                    throw(msg)
                }
                var retData = res.data
                if (retData.status !== 'OK') {
                    console.error(`Could not write to file at ${path}: ${retData.msg}`)
                }
                // return retData
            } catch(err) {
                var msg = ("Error in createDriveFolder:", err)
                console.error(msg)
                console.error("URL:", url)
                console.error("options:", options)
                throw(msg)
            }
        
        }
        

        const basename = path.posix.basename(uri.path);
        const parent = this._lookupParentDirectory(uri);
        let entry = parent.entries.get(basename);
        if (entry instanceof Directory) {
            throw vscode.FileSystemError.FileIsADirectory(uri);
        }
        if (!entry && !options.create) {
            throw vscode.FileSystemError.FileNotFound(uri);
        }
        if (entry && options.create && !options.overwrite) {
            throw vscode.FileSystemError.FileExists(uri);
        }
        if (!entry) {
            if(uri.path === '/fileFromInstabase.txt'){
                console.log('hereeeeeeeeeeee creating new file')
            }
            entry = new File(basename);
            parent.entries.set(basename, entry);
            this._fireSoon({ type: vscode.FileChangeType.Created, uri });
        }
        entry.mtime = Date.now();
        entry.size = content.byteLength;
        entry.data = content;

        this._fireSoon({ type: vscode.FileChangeType.Changed, uri });
    }

    // --- manage files/folders

    rename(oldUri: vscode.Uri, newUri: vscode.Uri, options: { overwrite: boolean }): void {

        if (!options.overwrite && this._lookup(newUri, true)) {
            throw vscode.FileSystemError.FileExists(newUri);
        }

        const entry = this._lookup(oldUri, false);
        const oldParent = this._lookupParentDirectory(oldUri);

        const newParent = this._lookupParentDirectory(newUri);
        const newName = path.posix.basename(newUri.path);

        oldParent.entries.delete(entry.name);
        entry.name = newName;
        newParent.entries.set(newName, entry);

        this._fireSoon(
            { type: vscode.FileChangeType.Deleted, uri: oldUri },
            { type: vscode.FileChangeType.Created, uri: newUri }
        );
    }

    delete(uri: vscode.Uri): void {
        const dirname = uri.with({ path: path.posix.dirname(uri.path) });
        const basename = path.posix.basename(uri.path);
        const parent = this._lookupAsDirectory(dirname, false);
        if (!parent.entries.has(basename)) {
            throw vscode.FileSystemError.FileNotFound(uri);
        }
        parent.entries.delete(basename);
        parent.mtime = Date.now();
        parent.size -= 1;
        this._fireSoon({ type: vscode.FileChangeType.Changed, uri: dirname }, { uri, type: vscode.FileChangeType.Deleted });
    }

    createDirectory(uri: vscode.Uri): void {
        
        console.log("Inside createDirectory")
        console.log("uri: ", uri);
        
        const basename = path.posix.basename(uri.path);
        console.log("basename: ",basename)
        const dirname = uri.with({ path: path.posix.dirname(uri.path) });
        console.log("dirname: ",dirname)
        const parent = this._lookupAsDirectory(dirname, false);
        console.log("parent: ",parent)

        const entry = new Directory(basename);
        parent.entries.set(entry.name, entry);
        parent.mtime = Date.now();
        parent.size += 1;
        this._fireSoon({ type: vscode.FileChangeType.Changed, uri: dirname }, { type: vscode.FileChangeType.Created, uri });
    }

    // --- lookup

    private _lookup(uri: vscode.Uri, silent: false): Entry;
    private _lookup(uri: vscode.Uri, silent: boolean): Entry | undefined;
    private _lookup(uri: vscode.Uri, silent: boolean): Entry | undefined {
        const parts = uri.path.split('/');
        let entry: Entry = this.root;
        for (const part of parts) {
            if (!part) {
                continue;
            }
            let child: Entry | undefined;
            if (entry instanceof Directory) {
                child = entry.entries.get(part);
            }
            if (!child) {
                if (!silent) {
                    throw vscode.FileSystemError.FileNotFound(uri);
                } else {
                    return undefined;
                }
            }
            entry = child;
        }
        return entry;
    }

    private _lookupAsDirectory(uri: vscode.Uri, silent: boolean): Directory {
        const entry = this._lookup(uri, silent);
        if (entry instanceof Directory) {
            return entry;
        }
        throw vscode.FileSystemError.FileNotADirectory(uri);
    }

    private _lookupAsFile(uri: vscode.Uri, silent: boolean): File {
        const entry = this._lookup(uri, silent);
        if (entry instanceof File) {
            return entry;
        }
        throw vscode.FileSystemError.FileIsADirectory(uri);
    }

    private _lookupParentDirectory(uri: vscode.Uri): Directory {
        const dirname = uri.with({ path: path.posix.dirname(uri.path) });
        return this._lookupAsDirectory(dirname, false);
    }

    // --- manage file events

    private _emitter = new vscode.EventEmitter<vscode.FileChangeEvent[]>();
    private _bufferedEvents: vscode.FileChangeEvent[] = [];
    private _fireSoonHandle?: NodeJS.Timer;

    readonly onDidChangeFile: vscode.Event<vscode.FileChangeEvent[]> = this._emitter.event;

    watch(_resource: vscode.Uri): vscode.Disposable {
        // ignore, fires for all changes...
        return new vscode.Disposable(() => { });
    }

    private _fireSoon(...events: vscode.FileChangeEvent[]): void {
        this._bufferedEvents.push(...events);

        if (this._fireSoonHandle) {
            clearTimeout(this._fireSoonHandle);
        }

        this._fireSoonHandle = setTimeout(() => {
            this._emitter.fire(this._bufferedEvents);
            this._bufferedEvents.length = 0;
        }, 5);
    }
}
