/** @jsxRuntime classic */
/** @jsx jsx */
import 'intersection-observer';
import { jsx } from '@keystone-ui/core';
import { ListMeta } from '@keystone-6/core/types';
export declare const NestedSetInput: ({ autoFocus, isDisabled, isLoading, list, state, field, onChange, }: {
    autoFocus?: boolean | undefined;
    controlShouldRenderValue: boolean;
    isDisabled: boolean;
    isLoading?: boolean | undefined;
    list: ListMeta;
    onChange: void;
    state: {
        left: number;
        right: number;
        depth: number;
        parentId: string;
    };
    field: string;
}) => jsx.JSX.Element;
