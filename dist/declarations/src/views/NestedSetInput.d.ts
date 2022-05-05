/** @jsxRuntime classic */
/** @jsx jsx */
import 'intersection-observer';
import { jsx } from '@keystone-ui/core';
import { ListMeta } from '@keystone-6/core/types';
export declare const NestedSetInput: ({ autoFocus, isDisabled, isLoading, list, state, field, onChange, graphqlSelection, path }: {
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
    graphqlSelection: string;
    path: string;
}) => jsx.JSX.Element;
