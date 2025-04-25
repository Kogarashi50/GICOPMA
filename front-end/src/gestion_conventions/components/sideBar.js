// src/gestion_conventions/components/sidebar.js

import React, { useState, useEffect, useRef, useCallback, useMemo } from "react";
import PropTypes from 'prop-types';
import { Link, useLocation } from "react-router-dom";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import menuItems, { faChevronDown, PERMISSIONS } from "../data"; // Adjust import path if needed
import "./sidebar.css";   // Import sidebar specific CSS

const EXCLUDED_ITEM_ID = 1; // ID for Brand/Logo item
const COLLAPSE_THRESHOLD_WIDTH = 100; // Width threshold for collapse

// Thresholds for "Middle" Area (pixels from visible top/bottom edges)
const MIDDLE_ZONE_TOP_THRESHOLD = 54; // Adjust if needed
const MIDDLE_ZONE_BOTTOM_THRESHOLD = 54; // Adjust if needed

const Sidebar = ({ currentUser }) => {
    // --- State ---
    const [activeItemId, setActiveItemId] = useState(null);
    const [selectorStyle, setSelectorStyle] = useState({ opacity: 0, top: 0, height: 0 });
    const [isCollapsed, setIsCollapsed] = useState(false);
    const [expandedItems, setExpandedItems] = useState({});
    const [scrollCounter, setScrollCounter] = useState(0); // State to trigger re-render on scroll

    // --- Refs ---
    const sidebarRef = useRef(null);
    const itemRefs = useRef({});
    const location = useLocation();
    const resizeObserverRef = useRef(null);

    // --- Permissions ---
    const userPermissions = currentUser?.permissions || [];

    // --- Helper Functions ---
    const getSubtitles = useCallback((parentId) => {
        return menuItems.filter(item => item.type === 'subtitle' && item.parentId === parentId);
    }, []);

    const getItemLabel = useCallback((label) => {
        // Keep existing logic
        if (typeof label === 'string') return label;
        if (React.isValidElement(label) && label.props?.children?.find) {
             const textSpan = label.props.children.find(child => child?.props?.className === 'brand-text');
             if (textSpan && typeof textSpan.props.children === 'string') { return textSpan.props.children.replace('<br />', ' '); }
        }
        if (React.isValidElement(label) && typeof label.props.children === 'string') { return label.props.children; }
        if (React.isValidElement(label) && label.type === 'span' && label.props?.children?.[0]?.type === 'img') {
             const textSpan = label.props.children.find(child => child?.props?.className === 'brand-text');
             return textSpan?.props?.children?.[0] || "Accueil";
        }
        return "Menu Item";
    }, []);


    // --- Event Handlers ---
    const handleItemClick = useCallback((item, event) => {
        // Keep existing logic
        if (item.type === 'heading') { event.preventDefault(); return; }
        let nextExpandedState = { ...expandedItems };
        if (item.hasSubtitles) { nextExpandedState = { [item.id]: !expandedItems[item.id] }; if (item.path === '#') event.preventDefault(); }
        else if (item.type === 'subtitle' && item.parentId) { nextExpandedState[item.parentId] = true; }
        setExpandedItems(nextExpandedState);
        if (item.path !== '#' && item.id !== EXCLUDED_ITEM_ID) setActiveItemId(item.id);
        const itemElement = itemRefs.current[item.id];
        if (itemElement && sidebarRef.current && item.id !== EXCLUDED_ITEM_ID && item.path !== '#') {
             setTimeout(() => itemRefs.current[item.id]?.scrollIntoView({ behavior: 'smooth', block: 'nearest' }), 50);
        }
    }, [expandedItems]);

    const updateSelector = useCallback((itemId, currentCollapsedState) => {
        // Keep existing logic
        const activeItem = menuItems.find(i => i.id === itemId);
        const activeItemElement = itemRefs.current[itemId];
        if (!activeItem || activeItem.type === 'heading' || activeItem.id === EXCLUDED_ITEM_ID || currentCollapsedState || !activeItemElement || !sidebarRef.current) {
            setSelectorStyle(prev => prev.opacity === 0 ? prev : { ...prev, opacity: 0 }); return;
        }
        if (activeItemElement.offsetHeight > 0) {
            const top = activeItemElement.offsetTop;
            const height = activeItemElement.offsetHeight;
            const newStyle = { top: `${top}px`, height: `${height}px`, opacity: 1 };
            setSelectorStyle(prev => (prev.top === newStyle.top && prev.height === newStyle.height && prev.opacity === newStyle.opacity) ? prev : newStyle);
        } else {
            setSelectorStyle(prev => prev.opacity === 0 ? prev : { ...prev, opacity: 0 });
        }
    }, []);

    // Scroll Handler to trigger re-calculation
    const handleScroll = useCallback(() => {
        setScrollCounter(prev => prev + 1);
    }, []);


    // --- useEffect Hooks ---

    // Setup Scroll Listener
    useEffect(() => {
        const sidebarElement = sidebarRef.current;
        if (sidebarElement) {
            sidebarElement.addEventListener('scroll', handleScroll, { passive: true });
            return () => {
                sidebarElement.removeEventListener('scroll', handleScroll);
            };
        }
    }, [handleScroll]);

    // Update active item based on URL
    useEffect(() => {
        const currentPath = location.pathname;
        const activeItem = menuItems.find(item => item?.path === currentPath && item.id !== EXCLUDED_ITEM_ID && item.type !== 'heading');
        const potentialActiveId = activeItem ? activeItem.id : null;
        setActiveItemId(prevId => prevId === potentialActiveId ? prevId : potentialActiveId);
        if (activeItem?.type === 'subtitle' && activeItem.parentId) {
            setExpandedItems(prev => ({ ...prev, [activeItem.parentId]: true }));
        }
    }, [location.pathname]);

    // Handle sidebar collapse/expand based on width
    useEffect(() => {
        const sidebarElement = sidebarRef.current;
        if (!sidebarElement) return;
        let resizeTimeout;
        const observerCallback = entries => { clearTimeout(resizeTimeout); resizeTimeout = setTimeout(() => { entries.forEach(entry => setIsCollapsed(prev => prev === (entry.contentRect.width < COLLAPSE_THRESHOLD_WIDTH) ? prev : (entry.contentRect.width < COLLAPSE_THRESHOLD_WIDTH))) }, 50); };
        if (resizeObserverRef.current) resizeObserverRef.current.disconnect();
        resizeObserverRef.current = new ResizeObserver(observerCallback);
        resizeObserverRef.current.observe(sidebarElement);
        setIsCollapsed(sidebarElement.getBoundingClientRect().width < COLLAPSE_THRESHOLD_WIDTH);
        return () => { clearTimeout(resizeTimeout); resizeObserverRef.current?.disconnect(); resizeObserverRef.current = null; };
    }, []);

    // Update selector position
    useEffect(() => {
        const rafId = requestAnimationFrame(() => updateSelector(activeItemId, isCollapsed));
        return () => cancelAnimationFrame(rafId);
    }, [activeItemId, isCollapsed, updateSelector]);


    // --- Filtering Logic (Permissions) ---
    const finalVisibleMenuItems = useMemo(() => {
        // Keep existing logic
        const permissionFilteredItems = menuItems.filter(item => !item.requiredPermission || userPermissions.includes(item.requiredPermission) || item.type === 'heading' || item.id === EXCLUDED_ITEM_ID);
        const visibleIds = new Set(permissionFilteredItems.filter(i => i.type !== 'heading' && i.id !== EXCLUDED_ITEM_ID).map(i => i.id));
        permissionFilteredItems.forEach(item => { if (item.type === 'subtitle' && item.parentId && visibleIds.has(item.id)) { const parent = menuItems.find(p => p.id === item.parentId); if (parent && (!parent.requiredPermission || userPermissions.includes(parent.requiredPermission))) visibleIds.add(item.parentId); } });
        return menuItems.filter((item, i, all) => { if (item.id === EXCLUDED_ITEM_ID) return menuItems.some(o => o.id === EXCLUDED_ITEM_ID); if (item.type !== 'heading') return visibleIds.has(item.id); if (item.type === 'heading') { for (let j = i + 1; j < all.length; j++) { if (all[j].type === 'heading') break; if (visibleIds.has(all[j].id)) return true; } return false; } return false; });
    }, [userPermissions]);


    // --- Calculate Selector Shape (Runs on EVERY Render) ---
    let shapeClass = '';
    if (sidebarRef.current && selectorStyle.opacity === 1 && !isCollapsed && activeItemId !== EXCLUDED_ITEM_ID) {
        const sidebar = sidebarRef.current;
        const scrollTop = sidebar.scrollTop;
        const clientHeight = sidebar.clientHeight;
        const selectorTop = parseFloat(selectorStyle.top);
        const selectorHeight = parseFloat(selectorStyle.height);

        if (!isNaN(selectorTop) && !isNaN(selectorHeight) && selectorHeight > 0 && clientHeight > 0) {
            const selectorTopInViewport = selectorTop - scrollTop;
            const selectorBottomInViewport = selectorTopInViewport + selectorHeight;
            const isNearVisibleTop = selectorTopInViewport < MIDDLE_ZONE_TOP_THRESHOLD;
            const isNearVisibleBottom = selectorBottomInViewport > (clientHeight - MIDDLE_ZONE_BOTTOM_THRESHOLD);

            // console.log(`ScrollT: ${scrollTop.toFixed(0)}, ClientH: ${clientHeight.toFixed(0)}, SelTopAbs: ${selectorTop.toFixed(0)}, SelH: ${selectorHeight.toFixed(0)}, ViewportTop: ${selectorTopInViewport.toFixed(0)}, ViewportBot: ${selectorBottomInViewport.toFixed(0)}, NearTop: ${isNearVisibleTop}, NearBot: ${isNearVisibleBottom}`);

            if (isNearVisibleTop || isNearVisibleBottom) {
                shapeClass = 'pill-shape';
            }
        }
    }
    const selectorClasses = ['selector-active', shapeClass].filter(Boolean).join(' ');


    // --- Render Function for a single menu item ---
    const renderMenuItem = (item) => {
        // Keep existing logic for headings, items, subtitles, brand, etc.
        if (!item || typeof item.id === 'undefined') return null;
        if (item.type === 'heading') { if (isCollapsed) return null; return ( <li key={item.id} className="sidebar-section-heading" aria-hidden="true"><div className="sidebar-hr "><hr /></div><span style={{ paddingLeft:'25px'}}>{item.label}</span></li> ); }
        const titleLabel = getItemLabel(item.label);
        const isActive = activeItemId === item.id && item.id !== EXCLUDED_ITEM_ID;
        const isSubtitle = item.type === 'subtitle';
        const isParent = item.hasSubtitles;
        const isEffectivelyExpanded = isParent && expandedItems[item.id];
        const liClasses = [ isActive ? "active" : "", isSubtitle ? "sidebar-subtitle" : "", isParent ? "sidebar-expandable" : "", isEffectivelyExpanded ? "expanded" : "", item.id === EXCLUDED_ITEM_ID ? "brand-item" : "" ].filter(Boolean).join(" ");
        const assignRef = (el) => { if (el && item.id !== EXCLUDED_ITEM_ID && item.type !== 'heading') itemRefs.current[item.id] = el; else if (itemRefs.current[item.id]) delete itemRefs.current[item.id]; };
        return (
            <React.Fragment key={item.id}>
                <li ref={assignRef} className={liClasses} aria-expanded={isParent ? isEffectivelyExpanded : undefined} >
                    <Link to={item.path} title={isCollapsed ? titleLabel || undefined : undefined} onClick={(e) => handleItemClick(item, e)} aria-current={isActive ? "page" : undefined} tabIndex={item.path === '#' ? -1 : 0}>
                        { item.id === EXCLUDED_ITEM_ID ? ( <span className="d-flex align-items-center mainItem"><img src="/logosite.png" className="bg-light Navlogo" width="50" height="50" alt="Logo GICOPMA" style={{padding:'4px'}} />{!isCollapsed && (<span className="brand-text text-start"> GICOPMA <small className="d-block" style={{fontSize:'8px', lineHeight: '1.1'}}>GESTION INTEGREE DES CONVENTIONS,<br/>PROJETS ET MARCHES</small> </span>)}</span> ) : item.icon ? ( <FontAwesomeIcon icon={item.icon} fixedWidth /> ) : ( isCollapsed && <span style={{ display: 'inline-block', width: '1.25em' }}></span> )}
                        {!isCollapsed && item.id !== EXCLUDED_ITEM_ID && ( <span className="sidebar-item-label">{item.label}{isParent && (<FontAwesomeIcon icon={faChevronDown} className={`expand-arrow ${isEffectivelyExpanded ? 'rotated' : ''}`} />)}</span> )}
                    </Link>
                </li>
                {isParent && isEffectivelyExpanded && !isCollapsed && ( <ul className="sidebar-submenu" role="group">{getSubtitles(item.id).filter(subItem => finalVisibleMenuItems.some(visible => visible.id === subItem.id)).map(renderMenuItem)}</ul> )}
            </React.Fragment>
        );
    };


    // --- Component Return ---
    return (
        <nav className={`sidebar ${isCollapsed ? 'is-collapsed' : ''}`} ref={sidebarRef} aria-label="Main Navigation">
            {/* RESTORED: Inner .top and .bottom divs */}
            <div className={selectorClasses} style={selectorStyle} aria-hidden="true">
                 <div className="top"></div>
                 <div className="bottom"></div>
            </div>
            {/* Menu List */}
            <ul className="sidebar-menu-list" role="menu">
                {finalVisibleMenuItems
                    .filter(item => !item.parentId || item.type === 'heading')
                    .map(renderMenuItem)}
            </ul>
        </nav>
    );
};

// --- PropTypes ---
Sidebar.propTypes = {
    currentUser: PropTypes.shape({
        permissions: PropTypes.arrayOf(PropTypes.string)
    })
};

export default Sidebar;