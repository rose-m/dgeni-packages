export function complicatedSignature(firstParam:boolean, secondParam = "withDefault", thirdOptional?:any) {
    return 42;
}

export class FunctionHelper {
    static CONST_MEMBER = "const";

    memberFunction(firstParam:boolean, secondParam = "withDefault", thirdOptional?:any):number {
        return 42;
    }

    memberConstDefault(param = FunctionHelper.CONST_MEMBER, ...andVarArg:number[]) {
        // empty
    }
}
