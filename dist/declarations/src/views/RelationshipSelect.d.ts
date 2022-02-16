/** @jsxRuntime classic */
/** @jsx jsx */
import 'intersection-observer';
import { jsx } from '@keystone-ui/core';
import { ListMeta } from '@keystone-6/core/types';
export declare const RelationshipSelect: ({ autoFocus, controlShouldRenderValue, isDisabled, isLoading, list, placeholder, portalMenu, state, field }: {
    autoFocus?: boolean | undefined;
    controlShouldRenderValue: boolean;
    isDisabled: boolean;
    isLoading?: boolean | undefined;
    list: ListMeta;
    placeholder?: string | undefined;
    portalMenu?: true | undefined;
    state: {
        value: {
            label: string;
            id: string;
            data?: Record<string, any>;
        } | null;
        onChange(value: {
            label: string;
            id: string;
            data: Record<string, any>;
        } | null): void;
    };
    field: string;
}) => jsx.JSX.Element;
