// Copyright 2017 The Kubernetes Authors.
//
// Licensed under the Apache License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License.
// You may obtain a copy of the License at
//
//     http://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing, software
// distributed under the License is distributed on an "AS IS" BASIS,
// WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
// See the License for the specific language governing permissions and
// limitations under the License.

import {HttpParams} from '@angular/common/http';
import {ChangeDetectionStrategy, ChangeDetectorRef, Component, Input} from '@angular/core';
import {Observable} from 'rxjs/Observable';
import {Service, ServiceList} from 'typings/backendapi';

import {ResourceListWithStatuses} from '../../../resources/list';
import {NotificationsService} from '../../../services/global/notifications';
import {EndpointManager, Resource} from '../../../services/resource/endpoint';
import {NamespacedResourceService} from '../../../services/resource/resource';
import {MenuComponent} from '../../list/column/menu/component';
import {ListGroupIdentifier, ListIdentifier} from '../groupids';

@Component({
  selector: 'kd-service-list',
  templateUrl: './template.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ServiceListComponent extends ResourceListWithStatuses<ServiceList, Service> {
  @Input() endpoint = EndpointManager.resource(Resource.service, true).list();

  constructor(
    private readonly service_: NamespacedResourceService<ServiceList>,
    notifications: NotificationsService,
    cdr: ChangeDetectorRef,
  ) {
    super('service', notifications, cdr);
    this.id = ListIdentifier.service;
    this.groupId = ListGroupIdentifier.discovery;

    // Register status icon handlers
    this.registerBinding(this.icon.checkCircle, 'kd-success', this.isInSuccessState.bind(this));
    this.registerBinding(this.icon.timelapse, 'kd-muted', this.isInPendingState.bind(this));

    // Register action columns.
    this.registerActionColumn<MenuComponent>('menu', MenuComponent);

    // Register dynamic columns.
    this.registerDynamicColumn('namespace', 'name', this.shouldShowNamespaceColumn_.bind(this));
  }

  getResourceObservable(params?: HttpParams): Observable<ServiceList> {
    return this.service_.get(this.endpoint, undefined, undefined, params);
  }

  map(serviceList: ServiceList): Service[] {
    return serviceList.services;
  }

  isInPendingState(resource: Service): boolean {
    return !this.isInSuccessState(resource);
  }

  /**
   * Success state of a Service depends on the type of service
   * https://kubernetes.io/docs/concepts/services-networking/service/#publishing-services-service-types
   * ClusterIP:     ClusterIP is defined
   * NodePort:      ClusterIP is defined
   * LoadBalancer:  ClusterIP is defined __and__ external endpoints exist
   * ExternalName:  true
   */
  isInSuccessState(resource: Service): boolean {
    switch (resource.type) {
      case 'ExternalName':
        return true;
      case 'LoadBalancer':
        if (resource.externalEndpoints.length === 0) {
          return false;
        }
        // fall through to share clusterIP existence test
      case 'ClusterIP':
      case 'NodePort':
      default:
        break;
    }
    return (resource.clusterIP.length > 0);
  }

  getDisplayColumns(): string[] {
    return ['statusicon', 'name', 'labels', 'clusterip', 'internalendp', 'externalendp', 'age'];
  }

  private shouldShowNamespaceColumn_(): boolean {
    return this.namespaceService_.areMultipleNamespacesSelected();
  }
}
