import {FileSystemNode, FileSystemProvider, URI} from 'langium'


export class TestFileSystemProvider implements FileSystemProvider {

    constructor(private files: Record<string, string>){}

    readFile(uri: URI): Promise<string> {
        const text = this.files[uri.toString()];
        if (text === undefined) {
            throw Error(`Test FileSystemProvider: File ${uri} not found`);
        }
        return  Promise.resolve(text);
    }
    readDirectory(uri: URI): Promise<FileSystemNode[]> {
        const prefix = uri.toString().replace(/\/+$/, '') + '/';
    return Promise.resolve(Object.keys(this.files)
      .filter(u => u.startsWith(prefix))
      .map(u => {
        const name = u.slice(prefix.length);
        return {
          uri: u as unknown as URI,
          isFile: true,
          isDirectory: false
        } as FileSystemNode;
      }));
    }
}