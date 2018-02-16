job "backend" {
	region = "global"
	datacenters = ["dc1"]
  type = "service"
	priority = 50
	update {
		stagger = "10s"
		max_parallel = 1
	}
	group "backend" {
		count = 1
		restart {
			attempts = 10
			interval = "5m"
			delay = "5s"
			mode = "delay"
		}
		task "backend" {
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
					mbits = 5
          port "http" {
          }
				}
			}
		}
  }
}
