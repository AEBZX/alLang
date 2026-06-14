export enum basic_type {
    number, string, boolean, map,void
}

export class modifier {
    constructor(public _public:boolean,public _async:boolean,public _static:boolean) {
    }
}