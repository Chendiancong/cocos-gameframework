export function getLocalDate(i: number, time: number) {
    // 参数i为时区值数字，比如北京为东八区则输入8，纽约为西5取输入-5
    if (typeof i !== 'number') return;
    let d = new Date(time);
    let len = d.getTime();
    let offset = d.getTimezoneOffset() * 60000;
    let utcTime = len + offset;
    return new Date(utcTime * 3600000 * i);
}