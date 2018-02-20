job "backend" {
	region = "global"
	datacenters = ["dc1"]
  type = "service"
	priority = 50
	update {
		stagger = "10s"
		max_parallel = 1
	}
	group "backend-server" {
		count = 3
		restart {
			attempts = 10
			interval = "5m"
			delay = "5s"
			mode = "delay"
		}
		task "backend-server" {
			driver = "docker"
			config {
			  image = "backend:deploy"
				port_map {
          "http"    = 8080
				}
			}
			service {
				name = "backend"
        tags = []
        port = "http"
				check {
					name = "alive"
					type = "http"
          path = "/v0/check"
					interval = "10s"
					timeout = "2s"
				}
			}
			resources {
				cpu = 1000
				memory = 1024
				network {
					mbits = 10
          port "http" {
          }
				}
			}
		}
  }
	group "backend-sync-orderbook" {
		count = 1
		restart {
			attempts = 10
			interval = "5m"
			delay = "5s"
			mode = "delay"
		}
		task "backend-sync-orderbook" {
			driver = "docker"
			config {
			  image = "backend:deploy"
			}
      env {
        "WYVERN_SYNC_ORDERBOOK" = "1"
      }
			resources {
				cpu = 1000
				memory = 1024
				network {
					mbits = 10
				}
			}
		}
  }
	group "backend-sync-logs" {
		count = 1
		restart {
			attempts = 10
			interval = "5m"
			delay = "5s"
			mode = "delay"
		}
		task "backend-sync-logs" {
			driver = "docker"
			config {
			  image = "backend:deploy"
			}
      env {
        "WYVERN_SYNC_LOGS" = "1"
      }
			resources {
				cpu = 2000
				memory = 2048
				network {
					mbits = 10
				}
			}
		}
  }
}
