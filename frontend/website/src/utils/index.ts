export function createPageUrl(pageName: string) {
    if (!pageName) return '/';
    return pageName.startsWith('/') ? pageName : '/' + pageName.replace(/ /g, '-');
}