// Explanation here: https://stackoverflow.com/questions/41292559/could-not-find-a-declaration-file-for-module-module-name-path-to-module-nam
// Doesn't seem like it is necessary, but otherwise I got a warning that said "Could not find a declaration file for module pandas-js"
// Apparently Angular wants you to specify a type
declare module 'pandas-js';
// For some reason I can put this here...bad programming practice?
declare module 'd3';
declare module 'file-saver';