import { useEffect, useRef } from 'react';
import { useEditor, EditorContent, Editor } from '@tiptap/react';
import { Extension } from '@tiptap/core';
import StarterKit from '@tiptap/starter-kit';
import Placeholder from '@tiptap/extension-placeholder';
import Underline from '@tiptap/extension-underline';
import { TextStyle } from '@tiptap/extension-text-style';
import Color from '@tiptap/extension-color';
import Highlight from '@tiptap/extension-highlight';
import TextAlign from '@tiptap/extension-text-align';
import { cn } from '@/lib/utils';
import {
    Bold, Italic, Underline as UnderlineIcon, Strikethrough,
    List, ListOrdered, Quote, Code, Heading1, Heading2,
    Undo, Redo, AlignLeft, AlignCenter, AlignRight, AlignJustify,
    Type, Highlighter, ChevronDown, AArrowUp, AArrowDown
} from 'lucide-react';
import * as Popover from '@radix-ui/react-popover';

declare module '@tiptap/core' {
    interface Commands<ReturnType> {
        fontSize: {
            /**
             * Set the font size
             */
            setFontSize: (size: string) => ReturnType;
            /**
             * Unset the font size
             */
            unsetFontSize: () => ReturnType;
        };
    }
}

export const FontSize = Extension.create({
    name: 'fontSize',
    addOptions() {
        return {
            types: ['textStyle'],
        };
    },
    addGlobalAttributes() {
        return [
            {
                types: this.options.types,
                attributes: {
                    fontSize: {
                        default: null,
                        parseHTML: element => element.style.fontSize.replace(/['"]+/g, ''),
                        renderHTML: attributes => {
                            if (!attributes.fontSize) {
                                return {};
                            }
                            return {
                                style: `font-size: ${attributes.fontSize}`,
                            };
                        },
                    },
                },
            },
        ];
    },
    addCommands() {
        return {
            setFontSize: fontSize => ({ chain }) => {
                return chain()
                    .setMark('textStyle', { fontSize })
                    .run();
            },
            unsetFontSize: () => ({ chain }) => {
                return chain()
                    .setMark('textStyle', { fontSize: null })
                    .removeEmptyTextStyle()
                    .run();
            },
        };
    },
});


const COLORS = [
    { name: 'Gray', value: '#64748b' },
    { name: 'Red', value: '#ef4444' },
    { name: 'Orange', value: '#f97316' },
    { name: 'Yellow', value: '#eab308' },
    { name: 'Green', value: '#22c55e' },
    { name: 'Emerald', value: '#10b981' },
    { name: 'Blue', value: '#3b82f6' },
    { name: 'Indigo', value: '#6366f1' },
    { name: 'Purple', value: '#a855f7' },
    { name: 'Violet', value: '#8b5cf6' },
    { name: 'Pink', value: '#ec4899' },
    { name: 'Rose', value: '#f43f5e' },
];

const HIGHLIGHTS = [
    { name: 'Yellow', value: '#fde047' },
    { name: 'Green', value: '#86efac' },
    { name: 'Blue', value: '#93c5fd' },
    { name: 'Purple', value: '#d8b4fe' },
    { name: 'Pink', value: '#f9a8d4' },
    { name: 'Red', value: '#fca5a5' },
    { name: 'Amber', value: '#fcd34d' },
    { name: 'Teal', value: '#99f6e4' },
    { name: 'Cyan', value: '#a5f3fc' },
    { name: 'Orange', value: '#fdba74' },
    { name: 'Lime', value: '#bef264' },
    { name: 'Sky', value: '#7dd3fc' },
];

const ColorPicker = ({ 
    editor, 
    type 
}: { 
    editor: Editor; 
    type: 'text' | 'highlight' 
}) => {
    const Icon = type === 'text' ? Type : Highlighter;
    const colors = type === 'text' ? COLORS : HIGHLIGHTS;
    
    return (
        <Popover.Root>
            <Popover.Trigger asChild>
                <button 
                    type="button"
                    onMouseDown={(e) => e.preventDefault()}
                    className="p-1.5 rounded-md hover:bg-gray-100 text-gray-700 flex items-center gap-0.5 transition-colors"
                >
                    <Icon className="w-4 h-4" />
                    <ChevronDown className="w-3 h-3 opacity-50" />
                </button>
            </Popover.Trigger>
            <Popover.Portal>
                <Popover.Content 
                    className="z-[100] bg-white p-2 rounded-lg shadow-xl border border-gray-200 grid grid-cols-6 gap-1"
                    sideOffset={5}
                    onOpenAutoFocus={(e) => e.preventDefault()}
                    data-tiptap-popover="true"
                >
                    {colors.map((c) => (
                        <button
                            key={c.value}
                            type="button"
                            onMouseDown={(e) => e.preventDefault()}
                            onClick={() => {
                                if (type === 'text') {
                                    if (c.value === 'inherit') {
                                        editor.chain().focus().unsetColor().run();
                                    } else {
                                        editor.chain().focus().setColor(c.value).run();
                                    }
                                } else {
                                    if (c.value === 'transparent') {
                                        editor.chain().focus().unsetHighlight().run();
                                    } else {
                                        editor.chain().focus().toggleHighlight({ color: c.value }).run();
                                    }
                                }
                            }}
                            className="w-6 h-6 rounded-md border border-gray-100 transition-transform hover:scale-110"
                            style={{ backgroundColor: c.value === 'inherit' ? 'transparent' : c.value }}
                            title={c.name}
                        >
                            {c.value === 'inherit' && <span className="text-[10px] text-gray-400">×</span>}
                        </button>
                    ))}
                    <Popover.Arrow className="fill-white" />
                </Popover.Content>
            </Popover.Portal>
        </Popover.Root>
    );
};

const FONT_SIZES_NUMBERS = [12, 14, 16, 18, 20, 24, 30, 36];

const MenuBar = ({ editor }: { editor: Editor | null }) => {
    if (!editor) return null;

    const handleIncreaseFontSize = () => {
        const current = editor.getAttributes('textStyle').fontSize;
        const currentNum = current ? parseInt(current) : 14; // Default prose-sm is 14px
        const next = FONT_SIZES_NUMBERS.find(s => s > currentNum) || FONT_SIZES_NUMBERS[FONT_SIZES_NUMBERS.length - 1];
        if (next === 14) editor.chain().focus().unsetFontSize().run();
        else editor.chain().focus().setFontSize(`${next}px`).run();
    };

    const handleDecreaseFontSize = () => {
        const current = editor.getAttributes('textStyle').fontSize;
        const currentNum = current ? parseInt(current) : 14;
        const prev = [...FONT_SIZES_NUMBERS].reverse().find(s => s < currentNum) || FONT_SIZES_NUMBERS[0];
        if (prev === 14) editor.chain().focus().unsetFontSize().run();
        else editor.chain().focus().setFontSize(`${prev}px`).run();
    };

    return (
        <div className="flex flex-wrap items-center gap-0.5 p-2 border-b border-gray-200 bg-white">
            <button 
                type="button" 
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => editor.chain().focus().undo().run()} 
                disabled={!editor.can().undo()} 
                className="p-1.5 rounded-md hover:bg-gray-100 text-gray-700 disabled:opacity-30 transition-colors"
            >
                <Undo className="w-4 h-4" />
            </button>
            <button 
                type="button" 
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => editor.chain().focus().redo().run()} 
                disabled={!editor.can().redo()} 
                className="p-1.5 rounded-md hover:bg-gray-100 text-gray-700 disabled:opacity-30 transition-colors"
            >
                <Redo className="w-4 h-4" />
            </button>
            <div className="w-px h-4 bg-gray-300 mx-1" />

            <button 
                type="button" 
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()} 
                className={cn("p-1.5 rounded-md hover:bg-gray-100 text-gray-700 transition-colors", editor.isActive('heading', { level: 1 }) && "bg-brand-50 text-brand-600")}
            >
                <Heading1 className="w-4 h-4" />
            </button>
            <button 
                type="button" 
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()} 
                className={cn("p-1.5 rounded-md hover:bg-gray-100 text-gray-700 transition-colors", editor.isActive('heading', { level: 2 }) && "bg-brand-50 text-brand-600")}
            >
                <Heading2 className="w-4 h-4" />
            </button>
            <div className="w-px h-4 bg-gray-300 mx-1" />

            <button 
                type="button" 
                onMouseDown={(e) => e.preventDefault()}
                onClick={handleDecreaseFontSize}
                className="p-1.5 rounded-md hover:bg-gray-100 text-gray-700 transition-colors"
                title="Decrease Font Size"
            >
                <AArrowDown className="w-4 h-4" />
            </button>
            <button 
                type="button" 
                onMouseDown={(e) => e.preventDefault()}
                onClick={handleIncreaseFontSize}
                className="p-1.5 rounded-md hover:bg-gray-100 text-gray-700 transition-colors"
                title="Increase Font Size"
            >
                <AArrowUp className="w-4 h-4" />
            </button>
            <div className="w-px h-4 bg-gray-300 mx-1" />

            <button 
                type="button" 
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => editor.chain().focus().toggleBold().run()} 
                className={cn("p-1.5 rounded-md hover:bg-gray-100 text-gray-700 transition-colors", editor.isActive('bold') && "bg-brand-50 text-brand-600")}
            >
                <Bold className="w-4 h-4" />
            </button>
            <button 
                type="button" 
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => editor.chain().focus().toggleItalic().run()} 
                className={cn("p-1.5 rounded-md hover:bg-gray-100 text-gray-700 transition-colors", editor.isActive('italic') && "bg-brand-50 text-brand-600")}
            >
                <Italic className="w-4 h-4" />
            </button>
            <button 
                type="button" 
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => editor.chain().focus().toggleUnderline().run()} 
                className={cn("p-1.5 rounded-md hover:bg-gray-100 text-gray-700 transition-colors", editor.isActive('underline') && "bg-brand-50 text-brand-600")}
            >
                <UnderlineIcon className="w-4 h-4" />
            </button>
            <button 
                type="button" 
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => editor.chain().focus().toggleStrike().run()} 
                className={cn("p-1.5 rounded-md hover:bg-gray-100 text-gray-700 transition-colors", editor.isActive('strike') && "bg-brand-50 text-brand-600")}
            >
                <Strikethrough className="w-4 h-4" />
            </button>

            <div className="w-px h-4 bg-gray-300 mx-1" />
            
            <ColorPicker editor={editor} type="text" />
            <ColorPicker editor={editor} type="highlight" />

            <div className="w-px h-4 bg-gray-300 mx-1" />

            <button 
                type="button" 
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => editor.chain().focus().setTextAlign('left').run()} 
                className={cn("p-1.5 rounded-md hover:bg-gray-100 text-gray-700 transition-colors", editor.isActive({ textAlign: 'left' }) && "bg-brand-50 text-brand-600")}
            >
                <AlignLeft className="w-4 h-4" />
            </button>
            <button 
                type="button" 
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => editor.chain().focus().setTextAlign('center').run()} 
                className={cn("p-1.5 rounded-md hover:bg-gray-100 text-gray-700 transition-colors", editor.isActive({ textAlign: 'center' }) && "bg-brand-50 text-brand-600")}
            >
                <AlignCenter className="w-4 h-4" />
            </button>
            <button 
                type="button" 
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => editor.chain().focus().setTextAlign('right').run()} 
                className={cn("p-1.5 rounded-md hover:bg-gray-100 text-gray-700 transition-colors", editor.isActive({ textAlign: 'right' }) && "bg-brand-50 text-brand-600")}
            >
                <AlignRight className="w-4 h-4" />
            </button>
            <button 
                type="button" 
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => editor.chain().focus().setTextAlign('justify').run()} 
                className={cn("p-1.5 rounded-md hover:bg-gray-100 text-gray-700 transition-colors", editor.isActive({ textAlign: 'justify' }) && "bg-brand-50 text-brand-600")}
            >
                <AlignJustify className="w-4 h-4" />
            </button>

            <div className="w-px h-4 bg-gray-300 mx-1" />

            <button 
                type="button" 
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => editor.chain().focus().toggleBulletList().run()} 
                className={cn("p-1.5 rounded-md hover:bg-gray-100 text-gray-700 transition-colors", editor.isActive('bulletList') && "bg-brand-50 text-brand-600")}
            >
                <List className="w-4 h-4" />
            </button>
            <button 
                type="button" 
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => editor.chain().focus().toggleOrderedList().run()} 
                className={cn("p-1.5 rounded-md hover:bg-gray-100 text-gray-700 transition-colors", editor.isActive('orderedList') && "bg-brand-50 text-brand-600")}
            >
                <ListOrdered className="w-4 h-4" />
            </button>
            <div className="w-px h-4 bg-gray-300 mx-1" />

            <button 
                type="button" 
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => editor.chain().focus().toggleBlockquote().run()} 
                className={cn("p-1.5 rounded-md hover:bg-gray-100 text-gray-700 transition-colors", editor.isActive('blockquote') && "bg-brand-50 text-brand-600")}
            >
                <Quote className="w-4 h-4" />
            </button>
            <button 
                type="button" 
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => editor.chain().focus().toggleCodeBlock().run()} 
                className={cn("p-1.5 rounded-md hover:bg-gray-100 text-gray-700 transition-colors", editor.isActive('codeBlock') && "bg-brand-50 text-brand-600")}
            >
                <Code className="w-4 h-4" />
            </button>
        </div>
    );
};

interface RichTextEditorProps {
    value: string;
    onChange: (val: string) => void;
    isActive?: boolean;
    onActiveChange?: (active: boolean) => void;
    placeholder?: string;
    minHeight?: string;
    maxHeight?: string;
}

export const RichTextEditor = ({ 
    value, 
    onChange, 
    isActive = true,
    onActiveChange,
    placeholder = "Add task description", 
    minHeight = "60px", 
    maxHeight = "400px" 
}: RichTextEditorProps) => {
    const containerRef = useRef<HTMLDivElement>(null);
    const didInitialFocus = useRef(false);

    const editor = useEditor({
        extensions: [
            StarterKit,
            Placeholder.configure({ 
                placeholder,
                showOnlyWhenEditable: false,
            }),
            Underline,
            TextStyle,
            FontSize,
            Color,
            Highlight.configure({ multicolor: true }),
            TextAlign.configure({
                types: ['heading', 'paragraph'],
            }),
        ],
        content: value,
        editable: isActive,
        onUpdate: ({ editor }) => {
            onChange(editor.getHTML());
        },
        editorProps: {
            attributes: {
                class: cn(
                    "tiptap prose prose-sm max-w-none focus:outline-none overflow-y-auto w-full",
                    isActive ? "px-4 py-3 min-h-[inherit]" : "p-0 min-h-[20px] cursor-text",
                    "[&>.is-editor-empty:first-child]:before:content-[attr(data-placeholder)] [&>.is-editor-empty:first-child]:before:text-gray-400 [&>.is-editor-empty:first-child]:before:float-left [&>.is-editor-empty:first-child]:before:pointer-events-none [&>.is-editor-empty:first-child]:before:h-0"
                ),
            },
        },
    });

    // Sync content if changed externally
    useEffect(() => {
        if (editor && value !== editor.getHTML()) {
            // Check if it's actually different content to avoid loops
            const currentHTML = editor.getHTML();
            if (value !== currentHTML) {
                editor.commands.setContent(value);
            }
        }
    }, [value, editor]);

    // Handle clicks outside the editor to deactivate it
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (!isActive || !onActiveChange) return;

            const target = event.target as HTMLElement;
            
            // If the element is within the main editor container
            if (containerRef.current?.contains(target)) return;

            // If the element is part of a tiptap popover (inside a Portal)
            if (target.closest('[data-tiptap-popover]')) return;

            // Otherwise, it's a true click outside
            onActiveChange(false);
        };

        if (isActive) {
            document.addEventListener('mousedown', handleClickOutside);
        }
        
        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
        };
    }, [isActive, onActiveChange]);

    // Handle external isActive changes
    useEffect(() => {
        if (editor) {
            editor.setEditable(isActive);
            if (isActive && !didInitialFocus.current) {
                // Slightly delay focus to ensure DOM is ready during transition
                setTimeout(() => {
                    editor.commands.focus('end');
                }, 50);
            }
        }
    }, [isActive, editor]);

    return (
        <div 
            ref={containerRef}
            onClick={() => {
                if (!isActive && onActiveChange) {
                    onActiveChange(true);
                }
            }}
            className={cn(
                "transition-all duration-200",
                isActive 
                    ? "border border-gray-300 rounded-lg overflow-hidden bg-white mb-4" 
                    : "border-transparent border rounded-lg hover:bg-gray-50/50 p-1 -m-1"
            )}
        >
            {isActive && <MenuBar editor={editor} />}
            <div className={cn("overflow-y-auto", isActive ? "h-auto" : "max-h-[150px]")} style={{ minHeight: isActive ? `calc(${minHeight} - 45px)` : '20px', maxHeight }}>
                <EditorContent editor={editor} />
            </div>
        </div>
    );
};
