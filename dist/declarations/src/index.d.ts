import { BaseListTypeInfo, FieldTypeFunc, CommonFieldConfig } from '@keystone-6/core/types';
declare type SelectDisplayConfig = {
    ui?: {
        displayMode?: 'select';
        /**
         * The path of the field to use from the related list for item labels in the select.
         * Defaults to the labelField configured on the related list.
         */
        labelField?: string;
    };
};
export declare type NestedSetData = {
    depth: number;
    left: number;
    right: number;
};
export declare type NestedSetConfig<ListTypeInfo extends BaseListTypeInfo> = CommonFieldConfig<ListTypeInfo> & {} & SelectDisplayConfig;
export declare const nestedSet: <ListTypeInfo extends BaseListTypeInfo>({ ...config }?: NestedSetConfig<ListTypeInfo>) => FieldTypeFunc<ListTypeInfo>;
export {};
