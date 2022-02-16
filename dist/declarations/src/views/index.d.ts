import { jsx } from '@keystone-ui/core';
import { CardValueComponent, CellComponent, FieldController, FieldControllerConfig, FieldProps } from '@keystone-6/core/types';
export declare const Field: ({ field, value, onChange }: FieldProps<typeof controller>) => jsx.JSX.Element;
export declare const Cell: CellComponent<typeof controller>;
export declare const CardValue: CardValueComponent<typeof controller>;
export declare type NestedSetValue = {
    id: string | null;
    initialValue: {
        label: string;
        id: string;
    } | null;
    value: {
        label: string;
        id: string;
    } | null;
};
declare type NestedSetController = FieldController<NestedSetValue>;
export declare const controller: (config: FieldControllerConfig) => FieldController<NestedSetController>;
export {};
