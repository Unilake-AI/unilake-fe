/**
 * Tệp này được sinh tự động bằng openapi-typescript.
 * Không sửa trực tiếp tệp này.
 */

export interface paths {
  '/api/v1/governance/catalog': {
    parameters: {
      query?: never
      header?: never
      path?: never
      cookie?: never
    }
    /**
     * Lấy catalog
     * @description Return catalog entries generated from registered domain metadata.
     */
    get: operations['get_catalog_api_v1_governance_catalog_get']
    put?: never
    post?: never
    delete?: never
    options?: never
    head?: never
    patch?: never
    trace?: never
  }
  '/api/v1/nlq/ask': {
    parameters: {
      query?: never
      header?: never
      path?: never
      cookie?: never
    }
    get?: never
    put?: never
    /**
     * Truy vấn NLQ
     * @description Run the NLQ flow from intent parsing to read-only execution.
     */
    post: operations['ask_nlq_api_v1_nlq_ask_post']
    delete?: never
    options?: never
    head?: never
    patch?: never
    trace?: never
  }
  '/': {
    parameters: {
      query?: never
      header?: never
      path?: never
      cookie?: never
    }
    /** Đọc đường dẫn gốc */
    get: operations['read_root__get']
    put?: never
    post?: never
    delete?: never
    options?: never
    head?: never
    patch?: never
    trace?: never
  }
  '/health': {
    parameters: {
      query?: never
      header?: never
      path?: never
      cookie?: never
    }
    /** Kiểm tra tình trạng hoạt động */
    get: operations['health_check_health_get']
    put?: never
    post?: never
    delete?: never
    options?: never
    head?: never
    patch?: never
    trace?: never
  }
}
export type webhooks = Record<string, never>
export interface components {
  schemas: {
    /**
     * Mục catalog
     * @description Catalog projection built from a registered domain dataset.
     */
    CatalogEntry: {
      /** Mã miền nghiệp vụ */
      domain_id: string
      /** Tập dữ liệu */
      dataset: string
      layer: components['schemas']['DataLayer']
      /** Phiên bản schema */
      schema_version: string
      /** Mô tả */
      description: string
      /** Các trường dữ liệu */
      fields: components['schemas']['FieldDefinition'][]
    }
    /**
     * Tầng dữ liệu
     * @description Logical data-lake layers exposed to domain implementations.
     * @enum {string}
     */
    DataLayer: 'bronze' | 'silver' | 'gold'
    /**
     * Định nghĩa trường dữ liệu
     * @description Portable field metadata used by catalog and NLQ consumers.
     */
    FieldDefinition: {
      /** Tên */
      name: string
      /** Kiểu dữ liệu */
      data_type: string
      /**
       * Cho phép null
       * @default true
       */
      nullable: boolean
      /**
       * Mô tả
       * @default
       */
      description: string
    }
    /** Lỗi kiểm tra HTTP */
    HTTPValidationError: {
      /** Chi tiết */
      detail?: components['schemas']['ValidationError'][]
    }
    /**
     * Yêu cầu truy vấn ngôn ngữ tự nhiên
     * @description User question submitted to the NLQ engine.
     */
    NaturalLanguageQueryRequest: {
      /** Câu hỏi */
      question: string
    }
    /**
     * Phản hồi truy vấn ngôn ngữ tự nhiên
     * @description NLQ response payload.
     */
    NaturalLanguageQueryResponse: {
      /** Câu lệnh SQL */
      sql: string
      /**
       * Các dòng dữ liệu
       * @default []
       */
      rows: {
        [key: string]: unknown
      }[]
    }
    /** Lỗi kiểm tra dữ liệu */
    ValidationError: {
      /** Vị trí */
      loc: (string | number)[]
      /** Thông báo */
      msg: string
      /** Loại lỗi */
      type: string
      /** Đầu vào */
      input?: unknown
      /** Ngữ cảnh */
      ctx?: Record<string, never>
    }
  }
  responses: never
  parameters: never
  requestBodies: never
  headers: never
  pathItems: never
}
export type $defs = Record<string, never>
export interface operations {
  get_catalog_api_v1_governance_catalog_get: {
    parameters: {
      query?: {
        domain_id?: string | null
      }
      header?: never
      path?: never
      cookie?: never
    }
    requestBody?: never
    responses: {
      /** @description Successful Response */
      200: {
        headers: {
          [name: string]: unknown
        }
        content: {
          'application/json': components['schemas']['CatalogEntry'][]
        }
      }
      /** @description Validation Error */
      422: {
        headers: {
          [name: string]: unknown
        }
        content: {
          'application/json': components['schemas']['HTTPValidationError']
        }
      }
    }
  }
  ask_nlq_api_v1_nlq_ask_post: {
    parameters: {
      query?: never
      header?: never
      path?: never
      cookie?: never
    }
    requestBody: {
      content: {
        'application/json': components['schemas']['NaturalLanguageQueryRequest']
      }
    }
    responses: {
      /** @description Successful Response */
      200: {
        headers: {
          [name: string]: unknown
        }
        content: {
          'application/json': components['schemas']['NaturalLanguageQueryResponse']
        }
      }
      /** @description Validation Error */
      422: {
        headers: {
          [name: string]: unknown
        }
        content: {
          'application/json': components['schemas']['HTTPValidationError']
        }
      }
    }
  }
  read_root__get: {
    parameters: {
      query?: never
      header?: never
      path?: never
      cookie?: never
    }
    requestBody?: never
    responses: {
      /** @description Successful Response */
      200: {
        headers: {
          [name: string]: unknown
        }
        content: {
          'application/json': {
            [key: string]: string
          }
        }
      }
    }
  }
  health_check_health_get: {
    parameters: {
      query?: never
      header?: never
      path?: never
      cookie?: never
    }
    requestBody?: never
    responses: {
      /** @description Successful Response */
      200: {
        headers: {
          [name: string]: unknown
        }
        content: {
          'application/json': {
            [key: string]: string
          }
        }
      }
    }
  }
}
