/** @jsxRuntime classic */
/** @jsx jsx */
import { jsx } from '@keystone-ui/core';
import { CardValueComponent, CellComponent, FieldController, FieldControllerConfig, FieldProps } from '@keystone-6/core/types';
export declare const Cell: CellComponent;
export declare const CardValue: CardValueComponent;
export declare const Field: ({ field, value, onChange, autoFocus }: FieldProps<typeof controller>) => jsx.JSX.Element;
declare type NestedSetData = {
    kind: 'one';
    initialValue: {
        label: string;
        id: string;
    } | null;
    value: {
        label: string;
        id: string;
    } | null;
};
export declare type NestedSetValue = null | NestedSetData;
declare type NestedSetControllerDisplay = {
    mode: string;
    refLabelField: string;
};
declare type NestedSetController = FieldController<NestedSetValue> & {
    listKey: string;
    refListKey: string;
    labelField: string;
    display: NestedSetControllerDisplay;
};
export declare const controller: (config: FieldControllerConfig<{
    listKey: string;
    labelField: string;
    displayMode: string;
}>) => NestedSetController;
export {};
