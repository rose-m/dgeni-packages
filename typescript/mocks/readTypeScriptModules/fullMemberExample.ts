export class FullMemberExample {
    publicString:string;

    protected protectedNumber:number;
    private privateBoolean:boolean;

    constructor(public constructorPublicString:string) {
    }

    publicMethod():string {
        return 'hello';
    }

    protected protectedMethod():void {
    }

    private privateMethod():void {
    }
}
