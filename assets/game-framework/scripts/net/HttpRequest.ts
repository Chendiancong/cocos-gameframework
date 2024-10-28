import { defer } from "../base/promise";

export type AjaxOption = {
    url: string,
    /** 是否为异步请求 */
    async?: boolean,
    success?: Function,
    failure?: Function,
    dataType?: "text"|"json",
    headers?: Record<string, string>,
    timeout?: number
}

/**
 * ajax请求
 */
export function ajax(option: AjaxOption) {
    const {
        url,
        success, failure,
        dataType,
        async,
        headers,
        timeout
    } = option;

    let xhr: XMLHttpRequest;
    if (window.navigator.userAgent.indexOf('MSIE') > 0) {
        xhr = new (<any>window).ActiveXObject('Microsoft.XMLHTTP');
    } else {
        xhr = new XMLHttpRequest();
    }

    if (timeout) {
        xhr.timeout = timeout;
        xhr.ontimeout = function () {
            typeof (failure) == 'function' && failure(`ajax time out:${url}`);
        }
    }

    xhr.onreadystatechange = function () {
        //4代表数据发送完毕
        if (xhr.readyState == 4) {
            //0为访问的本地，200到300代表访问服务器成功，304代表没做修改访问的是缓存
            if ((xhr.status >= 200 && xhr.status < 300) || xhr.status == 0 || xhr.status == 304) {
                var result = xhr.responseText;
                if (('' != result) && (dataType == 'json'))
                    result = JSON.parse(result);

                typeof (success) == 'function' && success(result);
            }
            else {
                typeof (failure) == 'function' && failure(xhr.statusText);
            }
        }
    };
    xhr.onerror = function () {
        typeof (failure) == 'function' && failure(`ajax error: ${url}`);
    }
    xhr.open('get', url, async === undefined ? true : async);
    if (headers) {
        for (let k in headers)
            xhr.setRequestHeader(k, headers[k]);
    }
    // xhr.setRequestHeader('X-Requested-With', 'XMLHttpRequest');
    xhr.send(null);
}

export function buildQueryString(obj: any) {
    var esc = encodeURIComponent;
    return Object.keys(obj).sort().map(function (k) {
        return esc(k) + '=' + esc(obj[k]);
    }).join('&');
}

export function getUrlArgs(url?: string) {
    let str = url || location.href;
    let index = str.indexOf("?");
    if (index >= 0) {
        str = str.substr(index + 1);
    }
    let decode = decodeURIComponent;

    return str.split("&").reduce(function (map, curr) {
        let index = curr.indexOf("=");
        if (index > 0) {
            map[decode(curr.substring(0, index))] = decode(curr.substr(index + 1));
        } else if (curr) {
            map[curr] = true;
        }
        return map;
    }, Object.create(null));
}

export async function requestAsync<T = any>(option: AjaxOption, retryTimes: number = 3) {
    const d = defer<T>();
    let handler: number;
    const timeout = 3000;
    const doit = () => {
        ajax({
            url: option.url,
            dataType: option.dataType,
            async: option.async,
            headers: option.headers,
            timeout,
            success: function (response: any) {
                if (handler) {
                    clearTimeout(handler);
                    handler = null;
                }
                option.success&&option.success(response);
                d.resolve(response as T);
            },
            failure: function (errMsg) {
                if (--retryTimes > 0)
                    doit();
                else {
                    if (handler) {
                        clearTimeout(handler);
                        handler = null;
                    }
                    option.failure&&option.failure(errMsg);
                    d.reject(new Error(`http request error:${errMsg},${option.url}`));
                }
            },
        })
    };

    handler = <any>setTimeout(() => d.reject(new Error(`http request timeout:${option.url}`)), retryTimes * timeout + 1000);

    doit();

    return d.promise;

    // return Promise.race([
    //     d.promise,
    //     new Promise((_, reject) => handler = <any>setTimeout(() => reject(new Error("http request timeout!")), 10000))
    // ]) as Promise<T>;
}