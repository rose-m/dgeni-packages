export enum SimpleEnum {
    FIRST,
    SECOND
}

export class TypesClass {
    simpleType:string;
    inferredBool = true;
    inferredEnum = SimpleEnum.FIRST;

    methodReturnsBool():boolean {
        return false;
    }

    methodInferredString() {
        return "string";
    }

    methodInferredEnum() {
        return SimpleEnum.SECOND;
    }

    methodInferredVoid() {
        // doesn't do anything
    }

    methodInlineType():{ x:string; y:number } {
        return {
            x: 'x',
            y: 0
        };
    }
}
