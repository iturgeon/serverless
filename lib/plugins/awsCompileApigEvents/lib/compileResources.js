'use strict';

const BbPromise = require('bluebird');
const _ = require('lodash');

module.exports = {
  compileResources() {
    this.resourcePaths = [];
    this.resourceLogicalIds = {};

    _.forEach(this.serverless.service.functions, (functionObj) => {
      _.forEach(functionObj.events.aws.http_endpoints, (pathParam) => {
        let path = pathParam;
        while (path !== '') {
          if (this.resourcePaths.indexOf(path) === -1) {
            this.resourcePaths.push(path);
          }

          const splittedPath = path.split('/');
          splittedPath.pop();
          path = splittedPath.join('/');
        }
      });
    });

    // ['users', 'users/create', 'users/create/something']
    this.resourcePaths.forEach(path => {
      const resourcesArray = path.split('/');
      // resource name is the last element in the endpoint. It's not unique.
      const resourceName = path.split('/')[path.split('/').length - 1];
      const resourcePath = path;
      const resourceIndex = this.resourcePaths.indexOf(resourcePath);
      const resourceLogicalId = `ApigResource${resourceIndex}`;
      this.resourceLogicalIds[resourcePath] = resourceLogicalId;
      resourcesArray.pop();

      let resourceParentId;
      if (resourcesArray.length === 0) {
        resourceParentId = '{ "Fn::GetAtt": ["RestApiApigEvent", "RootResourceId"] }';
      } else {
        const resourceParentPath = resourcesArray.join('/');
        const resourceParentIndex = this.resourcePaths.indexOf(resourceParentPath);
        resourceParentId = `{ "Ref" : "ApigResource${resourceParentIndex}" }`;
      }

      const resourceTemplate = `
        {
          "Type" : "AWS::ApiGateway::Resource",
          "Properties" : {
            "ParentId" : ${resourceParentId},
            "PathPart" : "${resourceName}",
            "RestApiId" : { "Ref" : "RestApiApigEvent" }
          }
        }
      `;

      const resourceObject = {
        [resourceLogicalId]: JSON.parse(resourceTemplate),
      };

      _.merge(this.serverless.service.resources.aws.Resources,
        resourceObject);
    });

    return BbPromise.resolve();
  },
};