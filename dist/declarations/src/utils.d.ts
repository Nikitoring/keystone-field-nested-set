import { KeystoneContext } from '@keystone-6/core/types';
export declare function isRoot(data: {
    [key: string]: any;
}): boolean;
export declare function getRoot(context: KeystoneContext, field: string, listType: string): Promise<any>;
export declare function createRoot(): Promise<{
    left: number;
    right: number;
    depth: number;
}>;
export declare function isLeaf(data: {
    [key: string]: number;
}): boolean;
export declare function getWeight(data: {
    [key: string]: number;
}): Promise<number>;
export declare function getParentId(data: {
    [key: string]: number;
}, context: KeystoneContext, field: string, listType: string): Promise<any>;
export declare function getParent(data: {
    [key: string]: any;
}, context: KeystoneContext, field: string, listType: string): Promise<any>;
export declare function getchildrenCount(data: {
    [key: string]: number;
}, context: KeystoneContext, field: string, listType: string): Promise<any>;
export declare function fetchRoot(rootId: string, context: KeystoneContext, listKey: string, fieldKey: string): Promise<any>;
export declare function getPrevSibling(prevSibling: string, context: KeystoneContext, listKey: string, fieldKey: string): Promise<false | {
    right: number;
}>;
export declare function getNextSibling(nextSibling: string, context: KeystoneContext, listKey: string, fieldKey: string): Promise<false | {
    left: any;
}>;
export declare function getChildOf(childOf: string, context: KeystoneContext, listKey: string, fieldKey: string): Promise<{
    depth: number;
    left: {
        lt: any;
    };
    right: {
        gt: any;
    };
}>;
export declare function getParentOf(parentId: string, context: KeystoneContext, listKey: string, fieldKey: string): Promise<{
    depth: any;
    left: {
        gt: any;
    };
    right: {
        lt: any;
    };
}>;
export declare function insertLastChildOf(parentId: string, context: KeystoneContext, listKey: string, fieldKey: string): Promise<false | {
    left: any;
    right: any;
    depth: any;
}>;
export declare function insertNextSiblingOf(nextSiblingId: string, context: KeystoneContext, listKey: string, fieldKey: string): Promise<false | {
    left: any;
    right: any;
    depth: any;
}>;
export declare function insertPrevSiblingOf(nextSiblingId: string, context: KeystoneContext, listKey: string, fieldKey: string): Promise<false | {
    left: any;
    right: any;
    depth: any;
}>;
export declare function moveNode(inputData: {
    [key: string]: any;
}, context: KeystoneContext, listKey: string, fieldKey: string, current: {
    [key: string]: any;
}): Promise<{} | null | undefined>;
export declare function deleteResolver(current: {
    [key: string]: any;
}, options: {
    [key: string]: any;
}): Promise<void>;
declare type NestedSetFieldInputType = {
    parentId?: string;
    prevSiblingOf?: string;
    nextSiblingOf?: string;
};
export declare function updateEntityIsNullFields(data: NestedSetFieldInputType, context: KeystoneContext, listKey: string, fieldKey: string): Promise<false | {
    left: any;
    right: any;
    depth: any;
} | undefined>;
export declare function nodeIsInTree(data: NestedSetFieldInputType, options: {
    [key: string]: any;
}): Promise<boolean>;
export {};
