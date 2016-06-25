export function complicatedSignature(firstParam:string, secondParam = "withDefault", thirdOptional?:any) {
    return 42;
}

export class FunctionHelper {

    memberFunction(firstParam:boolean, secondParam = "withDefault", thirdOptional?:any):number {
        return 42;
    }
}
