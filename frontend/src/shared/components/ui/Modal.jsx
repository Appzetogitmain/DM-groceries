import React from 'react';
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogDescription,
    DialogFooter,
} from "@/components/ui/dialog";
import { cn } from '@/lib/utils';

const Modal = ({ isOpen, onClose, title, children, footer, size = 'md', maxWidth, className }) => {
    const sizes = {
        sm: 'sm:max-w-md max-w-md',
        md: 'sm:max-w-lg max-w-lg',
        lg: 'sm:max-w-2xl max-w-2xl',
        xl: 'sm:max-w-4xl max-w-4xl',
        '2xl': 'sm:max-w-5xl max-w-5xl',
        '3xl': 'sm:max-w-6xl max-w-6xl',
        '4xl': 'sm:max-w-7xl max-w-7xl',
        full: 'sm:max-w-[95vw] max-w-[95vw] h-[95vh]',
    };

    const resolvedWidth = maxWidth
        ? (maxWidth.startsWith('max-w-') ? `sm:${maxWidth} ${maxWidth}` : maxWidth)
        : (sizes[size] || sizes.md);

    return (
        <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
            <DialogContent className={cn("overflow-hidden p-0", resolvedWidth, className)}>
                <DialogHeader className="px-6 pt-3 pb-2 border-b border-gray-100/50 bg-gray-50/10">
                    <DialogTitle className="text-2xl font-semibold text-gray-900">{title}</DialogTitle>
                    <DialogDescription className="sr-only">Modal content</DialogDescription>
                </DialogHeader>

                <div
                    className="px-6 pt-3 pb-5 max-h-[80vh] overflow-y-auto overscroll-contain touch-pan-y outline-none focus:outline-none"
                    tabIndex={-1}
                    onWheel={(e) => e.stopPropagation()}
                    onTouchMove={(e) => e.stopPropagation()}
                >
                    {children}
                </div>

                {footer && (
                    <DialogFooter className="px-6 py-4 bg-gray-50/30 border-t border-gray-100/50 sm:justify-end gap-3">
                        {footer}
                    </DialogFooter>
                )}
            </DialogContent>
        </Dialog>
    );
};

export default Modal;

