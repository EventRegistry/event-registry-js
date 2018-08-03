import * as _ from "lodash";
import { mainLangs, Query, QueryParamsBase } from "./base";
import { EventRegistry } from "./eventRegistry";
import { ComplexArticleQuery } from "./query";
import { ArticleInfoFlags, ReturnInfo } from "./returnInfo";
import { ER } from "./types";

export class QueryArticles extends Query<RequestArticles> {
    constructor(args: ER.QueryArticles.Arguments = {}) {
        super();
        const {
            keywords,
            conceptUri,
            categoryUri,
            sourceUri,
            sourceLocationUri,
            sourceGroupUri,
            locationUri,
            lang,
            dateStart,
            dateEnd,
            dateMentionStart,
            dateMentionEnd,
            ignoreKeywords,
            ignoreConceptUri,
            ignoreCategoryUri,
            ignoreSourceUri,
            ignoreSourceLocationUri,
            ignoreSourceGroupUri,
            ignoreLocationUri,
            ignoreLang,
            keywordsLoc = "body",
            ignoreKeywordsLoc = "body",
            isDuplicateFilter = "keepAll",
            hasDuplicateFilter = "keepAll",
            eventFilter = "keepAll",
            dataType = "news",
            requestedResult = new RequestArticlesInfo(),
        } = args;
        this.setVal("action", "getArticles");
        this.setQueryArrVal(keywords, "keyword", "keywordOper", "and");
        this.setQueryArrVal(conceptUri, "conceptUri", "conceptOper", "and");
        this.setQueryArrVal(categoryUri, "categoryUri", "categoryOper", "or");
        this.setQueryArrVal(sourceUri, "sourceUri", "sourceOper", "or");
        this.setQueryArrVal(sourceLocationUri, "sourceLocationUri", undefined, "or");
        this.setQueryArrVal(sourceGroupUri, "sourceGroupUri", "sourceGroupOper", "or");
        this.setQueryArrVal(locationUri, "locationUri", undefined, "or");
        this.setQueryArrVal(lang, "lang", undefined, "or");
        if (!_.isUndefined(dateStart)) {
            this.setDateVal("dateStart", dateStart);
        }
        if (!_.isUndefined(dateEnd)) {
            this.setDateVal("dateEnd", dateEnd);
        }
        if (!_.isUndefined(dateMentionStart)) {
            this.setDateVal("dateMentionStart", dateMentionStart);
        }
        if (!_.isUndefined(dateMentionEnd)) {
            this.setDateVal("dateMentionEnd", dateMentionEnd);
        }
        this.setQueryArrVal(ignoreKeywords, "ignoreKeyword", undefined, "or");
        this.setQueryArrVal(ignoreConceptUri, "ignoreConceptUri", undefined, "or");
        this.setQueryArrVal(ignoreCategoryUri, "ignoreCategoryUri", undefined, "or");
        this.setQueryArrVal(ignoreSourceUri, "ignoreSourceUri", undefined, "or");
        this.setQueryArrVal(ignoreSourceLocationUri, "ignoreSourceLocationUri", undefined, "or");
        this.setQueryArrVal(ignoreSourceGroupUri, "ignoreSourceGroupUri", undefined, "or");
        this.setQueryArrVal(ignoreLocationUri, "ignoreLocationUri", undefined, "or");
        this.setQueryArrVal(ignoreLang, "ignoreLang", undefined, "or");
        this.setValIfNotDefault("keywordLoc", keywordsLoc, "body");
        this.setValIfNotDefault("ignoreKeywordLoc", ignoreKeywordsLoc, "body");
        this.setValIfNotDefault("isDuplicateFilter", isDuplicateFilter, "keepAll");
        this.setValIfNotDefault("hasDuplicateFilter", hasDuplicateFilter, "keepAll");
        this.setValIfNotDefault("eventFilter", eventFilter, "keepAll");
        this.setValIfNotDefault("dataType", dataType, "news");
        this.setRequestedResult(requestedResult);
    }

    public get path() {
        return "/json/article";
    }

    public setRequestedResult(requestArticles) {
        if (!(requestArticles instanceof RequestArticles)) {
            throw new Error("QueryArticles class can only accept result requests that are of type RequestArticles");
        }
        this.resultTypeList = [requestArticles];
    }

    public static initWithArticleUriList(...args);
    public static initWithArticleUriList(uriList) {
        const q = new QueryArticles();
        if (!_.isArray(uriList)) {
            throw new Error("uriList has to be a list of strings that represent article uris");
        }
        q.params = {
            action: "getArticles",
            articleUri: uriList,
        };
        return q;
    }

    public static initWithArticleUriWgtList(...args);
    public static initWithArticleUriWgtList(uriWgtList) {
        const q = new QueryArticles();
        if (!_.isArray(uriWgtList)) {
            throw new Error("uriList has to be a list of strings that represent article uris");
        }
        q.params = {
            action: "getArticles",
            articleUriWgtList: _.join(uriWgtList, ","),
        };
        return q;
    }

    public static initWithComplexQuery(...args);
    public static initWithComplexQuery(complexQuery) {
        const query = new QueryArticles();
        if (complexQuery instanceof ComplexArticleQuery) {
            query.setVal("query", JSON.stringify(complexQuery.getQuery()));
        } else if (_.isString(complexQuery)) {
            query.setVal("query", complexQuery);
        } else if (_.isObject(complexQuery)) {
            query.setVal("query", JSON.stringify(complexQuery));
        } else {
            throw new Error("The instance of query parameter was not a ComplexArticleQuery, a string or an object");
        }
        return query;
    }

}

export class QueryArticlesIter extends QueryArticles {
    private readonly er: EventRegistry;
    private readonly sortBy;
    private readonly sortByAsc;
    private readonly returnInfo;
    private readonly maxItems;
    private page = 0;
    private pages = 1;
    private items = [];
    private returnedSoFar = 0;

    constructor(er: EventRegistry, args: {[name: string]: any} = {}) {
        super(args);
        _.defaults(args, {
            sortBy: "rel",
            sortByAsc: false,
            returnInfo: new ReturnInfo(),
            maxItems: -1,
        });
        const {sortBy, sortByAsc, returnInfo, maxItems} = args;
        this.er = er;
        this.sortBy = sortBy;
        this.sortByAsc = sortByAsc;
        this.returnInfo = returnInfo;
        this.maxItems = maxItems;
    }

    public async count() {
        this.setRequestedResult(new RequestArticlesInfo());
        const response = await this.er.execQuery(this);

        if (_.has(response, "error")) {
            console.error(_.get(response, "error"));
        }

        return _.get(response, "articles.totalResults", 0);
    }

    public execQuery(callback: (item, error) => void, doneCallback?: (error) => void) {
        this.getNextBatch(callback, doneCallback);
    }

    public static initWithComplexQuery(er: EventRegistry, complexQuery, args: {[name: string]: any} = {}) {
        const {dataType = "news", ...params} = args;
        const query = new QueryArticlesIter(er, {dataType, ...params});
        if (complexQuery instanceof ComplexArticleQuery) {
            query.setVal("query", JSON.stringify(complexQuery.getQuery()));
        } else if (_.isString(complexQuery)) {
            query.setVal("query", complexQuery);
        } else if (_.isObject(complexQuery)) {
            query.setVal("query", JSON.stringify(complexQuery));
        } else {
            throw new Error("The instance of query parameter was not a ComplexArticleQuery, a string or an object");
        }
        return query;
    }

    /**
     * Extract the results according to maxItems
     * @param response response from the backend
     */
    private extractResults(response): Array<{[name: string]: any}> {
        const results = _.get(response, "articles.results", []);
        const extractedSize = this.maxItems !== -1 ? this.maxItems - this.returnedSoFar : _.size(results);
        return _.compact(_.pullAt(results, _.range(0, extractedSize)) as Array<{}>);
    }

    private async getNextBatch(callback, doneCallback) {
        try {
            this.page += 1;
            if (this.page > this.pages || (this.maxItems !== -1 && this.returnedSoFar >= this.maxItems)) {
                if (doneCallback) {
                    doneCallback();
                }
                return;
            }
            const requestArticles = new RequestArticlesInfo({
                page: this.page,
                sortBy: this.sortBy,
                sortByAsc: this.sortByAsc,
                returnInfo: this.returnInfo,
            });
            this.setRequestedResult(requestArticles);
            if (this.er.verboseOutput) {
                console.log(`Downloading article page ${this.page}...`);
            }
            const response = await this.er.execQuery(this);
            const error = _.get(response, "error", "");
            if (error) {
                console.error(`Error while obtaining a list of articles:  ${_.get(response, "error")}`);
            } else {
                this.pages = _.get(response, "articles.pages", 0);
            }
            const results = this.extractResults(response);
            this.returnedSoFar += _.size(results);
            callback(results, error);
            this.items = [...this.items, ...results];
            this.getNextBatch(callback, doneCallback);
        } catch (error) {
            if (doneCallback) {
                doneCallback(error);
            }
            console.error(error);
            return;
        }
    }

}

export class RequestArticles {}

export class RequestArticlesInfo extends RequestArticles {
    public resultType = "articles";
    public params;
    constructor({page = 1,
                 count = 200,
                 sortBy = "date",
                 sortByAsc = false,
                 returnInfo = new ReturnInfo(),
                } = {}) {
        super();
        if (page < 1) {
            throw new RangeError("page has to be >= 1");
        }
        if (count > 200) {
            throw new RangeError("at most 200 articles can be returned per call");
        }
        this.params = {};
        this.params["articlesPage"] = page;
        this.params["articlesCount"] = count;
        this.params["articlesSortBy"] = sortBy;
        this.params["articlesSortByAsc"] = sortByAsc;
        this.params = _.extend({}, this.params, returnInfo.getParams("articles"));
    }
}

export class RequestArticlesUriWgtList extends RequestArticles {
    public resultType = "uriWgtList";
    public params;
    constructor({page = 1,
                 count = 10000,
                 sortBy = "fq",
                 sortByAsc = false,
                } = {}) {
        super();
        if (page < 1) {
            throw new RangeError("page has to be >= 1");
        }
        if (count > 50000) {
            throw new RangeError("at most 50000 items can be returned per call");
        }
        this.params = {};
        this.params["uriWgtListPage"] = page;
        this.params["uriWgtListCount"] = count;
        this.params["uriWgtListSortBy"] = sortBy;
        this.params["uriWgtListSortByAsc"] = sortByAsc;
    }

    public setPage(page) {
        if (page < 1) {
            throw new RangeError("page has to be >= 1");
        }
        this.params["uriWgtListPage"] = page;
    }
}

export class RequestArticlesTimeAggr extends RequestArticles {
    public resultType = "timeAggr";
}

export class RequestArticlesConceptAggr extends RequestArticles {
    public resultType = "conceptAggr";
    public params;
    constructor({conceptCount = 25,
                 articlesSampleSize = 10000,
                 returnInfo = new ReturnInfo(),
                } = {}) {
        super();
        if (conceptCount > 500) {
            throw new RangeError("At most 500 concepts can be returned per call");
        }
        if (articlesSampleSize > 20000) {
            throw new RangeError("at most 20000 articles can be used for computation sample");
        }
        this.params = {};
        this.params["conceptAggrConceptCount"] = conceptCount;
        this.params["conceptAggrSampleSize"] = articlesSampleSize;
        this.params = _.extend({}, this.params, returnInfo.getParams("conceptAggr"));
    }
}

export class RequestArticlesCategoryAggr extends RequestArticles {
    public resultType = "categoryAggr";
    public params;
    constructor({articlesSampleSize = 20000,
                 returnInfo = new ReturnInfo(),
                } = {}) {
        super();
        if (articlesSampleSize > 50000) {
            throw new RangeError("at most 50000 articles can be used for computation sample");
        }
        this.params = {};
        this.params["categoryAggrSampleSize"] = articlesSampleSize;
        this.params = _.extend({}, this.params, returnInfo.getParams("categoryAggr"));
    }
}

export class RequestArticlesSourceAggr extends RequestArticles {
    public resultType = "sourceAggr";
    public params;
    constructor({articlesSampleSize = 20000,
                 returnInfo = new ReturnInfo(),
                } = {}) {
        super();
        if (articlesSampleSize > 1000000) {
            throw new RangeError("at most 1000000 articles can be used for computation sample");
        }
        this.params = {};
        this.params["sourceAggrSampleSize"] = articlesSampleSize;
        this.params = _.extend({}, this.params, returnInfo.getParams("sourceAggr"));
    }
}

export class RequestArticlesKeywordAggr extends RequestArticles {
    public resultType = "keywordAggr";
    public params;
    constructor({lang = "eng",
                 articlesSampleSize = 2000,
                } = {}) {
        super();
        if (articlesSampleSize > 20000) {
            throw new RangeError("at most 20000 articles can be used for computation sample");
        }
        this.params = {};
        this.params["keywordAggrLang"] = lang;
        this.params["keywordAggrSampleSize"] = articlesSampleSize;
    }
}

export class RequestArticlesConceptGraph extends RequestArticles {
    public resultType = "conceptGraph";
    public params;
    constructor({conceptCount = 25,
                 linkCount = 50,
                 articlesSampleSize = 10000,
                 returnInfo = new ReturnInfo(),
                } = {}) {
        super();
        if (conceptCount > 1000) {
            throw new RangeError("At most 1000 concepts can be returned per call");
        }
        if (linkCount > 2000) {
            throw new RangeError("at most 2000 links can be returned per call");
        }
        if (articlesSampleSize > 50000) {
            throw new RangeError("at most 50000 results can be used for computation sample");
        }
        this.params = {};
        this.params["conceptGraphConceptCount"] = conceptCount;
        this.params["conceptGraphLinkCount"] = linkCount;
        this.params["conceptGraphSampleSize"] = articlesSampleSize;
        this.params = _.extend({}, this.params, returnInfo.getParams("conceptGraph"));
    }
}

export class RequestArticlesConceptMatrix extends RequestArticles {
    public resultType = "conceptMatrix";
    public params;
    constructor({conceptCount = 25,
                 measure = "pmi",
                 articlesSampleSize = 10000,
                 returnInfo = new ReturnInfo(),
                } = {}) {
        super();
        if (conceptCount > 200) {
            throw new RangeError("At most 200 concepts can be returned per call");
        }
        if (articlesSampleSize > 50000) {
            throw new RangeError("at most 50000 results can be used for computation sample");
        }
        this.params = {};
        this.params["conceptMatrixConceptCount"] = conceptCount;
        this.params["conceptMatrixMeasure"] = measure;
        this.params["conceptMatrixSampleSize"] = articlesSampleSize;
        this.params = _.extend({}, this.params, returnInfo.getParams("conceptMatrix"));
    }
}

export class RequestArticlesConceptTrends extends RequestArticles {
    public resultType = "conceptTrends";
    public params;
    constructor({conceptUris = undefined,
                 count = 25,
                 articlesSampleSize = 10000,
                 returnInfo = new ReturnInfo(),
                } = {}) {
        super();
        if (count > 50) {
            throw new RangeError("At most 50 concepts can be returned per call");
        }
        if (articlesSampleSize > 50000) {
            throw new RangeError("at most 50000 results can be used for computation sample");
        }
        this.params = {};
        if (!_.isUndefined(conceptUris)) {
            this.params["conceptTrendsConceptUri"] = conceptUris;
        }
        this.params["conceptTrendsConceptCount"] = count;
        this.params["conceptTrendsSampleSize"] = articlesSampleSize;
        this.params = _.extend({}, this.params, returnInfo.getParams("conceptTrends"));
    }
}

export class RequestArticlesDateMentionAggr extends RequestArticles {
    public resultType = "dateMentionAggr";
}

export class RequestArticlesRecentActivity extends RequestArticles {
    public resultType = "recentActivity";
    public params;
    constructor({maxArticleCount = 100,
                 updatesAfterTm = undefined,
                 updatesAfterMinsAgo = undefined,
                 lang = undefined,
                 mandatorySourceLocation = false,
                 returnInfo = new ReturnInfo(),
                } = {}) {
        super();
        if (maxArticleCount > 1000) {
            throw new RangeError("At most 1000 articles can be returned per call");
        }
        if (!_.isUndefined(updatesAfterTm) && !_.isUndefined(updatesAfterMinsAgo)) {
            throw new Error("You should specify either updatesAfterTm or updatesAfterMinsAgo parameter, but not both");
        }
        this.params = {};
        this.params["recentActivityArticlesMaxArticleCount"] = maxArticleCount;
        if (!_.isUndefined(updatesAfterTm)) {
            this.params["recentActivityArticlesUpdatesAfterTm"] = QueryParamsBase.encodeDateTime(updatesAfterTm);
        }
        if (!_.isUndefined(updatesAfterMinsAgo)) {
            this.params["recentActivityEventsUpdatesAfterMinsAgo"] = updatesAfterMinsAgo;
        }
        if (!_.isUndefined(lang)) {
            this.params["recentActivityArticlesLang"] = lang;
        }
        this.params["recentActivityArticlesMandatorySourceLocation"] = mandatorySourceLocation;
        this.params = _.extend({}, this.params, returnInfo.getParams("recentActivityArticles"));
    }
}
